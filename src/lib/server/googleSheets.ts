import "server-only";

import fs from "fs";
import path from "path";
import { google } from "googleapis";

type SheetValues = string[][];

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

const SERVICE_ACCOUNT_FILE_CANDIDATES = [
  "sales-brandboard-e1cad5e4d801.json",
  "service-account.json",
];

let cachedCredentials: ServiceAccountCredentials | null | undefined;
let cachedSpreadsheetId: string | null | undefined;

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const unwrapped = trimmed.replace(/^(['"])([\s\S]*)\1$/, "$2");
  return unwrapped.trim() || null;
}

function normalizePrivateKey(value: string | undefined): string | null {
  const normalizedValue = normalizeEnvValue(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.replace(/\\n/g, "\n");
}

function looksLikePrivateKey(value: string): boolean {
  return (
    /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/.test(value) &&
    /-----END(?: [A-Z]+)* PRIVATE KEY-----/.test(value)
  );
}

function readServiceAccountFile(filePath: string): ServiceAccountCredentials | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      client_email?: string;
      private_key?: string;
    };

    const clientEmail = normalizeEnvValue(parsed.client_email);
    const privateKey = normalizePrivateKey(parsed.private_key);

    if (!clientEmail || !privateKey || !looksLikePrivateKey(privateKey)) {
      return null;
    }

    return {
      clientEmail,
      privateKey,
    };
  } catch {
    return null;
  }
}

function readEnvServiceAccountCredentials(): ServiceAccountCredentials | null {
  const clientEmail =
    normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) ||
    normalizeEnvValue(process.env.GOOGLE_SHEETS_CLIENT_EMAIL) ||
    normalizeEnvValue(process.env.GOOGLE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(
    process.env.GOOGLE_PRIVATE_KEY ||
      process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
      process.env.GOOGLE_CLIENT_PRIVATE_KEY,
  );

  if (!clientEmail || !privateKey || !looksLikePrivateKey(privateKey)) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
  };
}

function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  if (cachedCredentials !== undefined) {
    return cachedCredentials;
  }

  const envCredentials = readEnvServiceAccountCredentials();
  if (envCredentials) {
    cachedCredentials = envCredentials;
    return cachedCredentials;
  }

  const applicationCredentialsPath = normalizeEnvValue(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
  if (applicationCredentialsPath) {
    const resolvedPath = path.isAbsolute(applicationCredentialsPath)
      ? applicationCredentialsPath
      : path.join(process.cwd(), applicationCredentialsPath);
    const credentials = readServiceAccountFile(resolvedPath);
    if (credentials) {
      cachedCredentials = credentials;
      return cachedCredentials;
    }
  }

  for (const candidate of SERVICE_ACCOUNT_FILE_CANDIDATES) {
    const fullPath = path.join(process.cwd(), candidate);
    const credentials = readServiceAccountFile(fullPath);
    if (credentials) {
      cachedCredentials = credentials;
      return cachedCredentials;
    }
  }

  cachedCredentials = null;
  return cachedCredentials;
}

function getOptionalSpreadsheetId(): string | null {
  if (cachedSpreadsheetId !== undefined) {
    return cachedSpreadsheetId;
  }

  const sheetId =
    normalizeEnvValue(process.env.GOOGLE_SHEET_ID) ||
    normalizeEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);

  cachedSpreadsheetId = sheetId || null;
  return cachedSpreadsheetId;
}

function getSpreadsheetId(): string {
  const sheetId = getOptionalSpreadsheetId();

  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID.");
  }

  return sheetId;
}

function getAuth() {
  const credentials = getServiceAccountCredentials();

  if (!credentials) {
    throw new Error("Google Sheets service account credentials are not configured.");
  }

  return new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function createSheetsClient() {
  return google.sheets({
    version: "v4",
    auth: getAuth(),
  });
}

function normalizeValues(values: unknown): SheetValues {
  return Array.isArray(values) ? (values as SheetValues) : [];
}

function getSheetNameFromRange(range: string): string {
  const [sheetName = ""] = range.split("!");
  return sheetName.replace(/^'(.*)'$/, "$1");
}

export function hasGoogleSheetsConfig(): boolean {
  return Boolean(getServiceAccountCredentials() && getOptionalSpreadsheetId());
}

export async function getSheetData(range: string): Promise<SheetValues> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
  });

  return normalizeValues(res.data.values);
}

export async function getMultipleSheetValues(
  ranges: string[],
): Promise<Record<string, SheetValues>> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: getSpreadsheetId(),
    ranges,
  });

  const valuesByRange = Object.fromEntries(ranges.map((range) => [range, [] as SheetValues]));
  const requestedRangesBySheet = new Map(
    ranges.map((range) => [getSheetNameFromRange(range), range]),
  );

  for (const valueRange of res.data.valueRanges ?? []) {
    if (!valueRange.range) {
      continue;
    }

    const matchedRange = requestedRangesBySheet.get(getSheetNameFromRange(valueRange.range));
    if (!matchedRange) {
      continue;
    }

    valuesByRange[matchedRange] = normalizeValues(valueRange.values);
  }

  return valuesByRange;
}

export async function getSheetDataAsObjects(range: string): Promise<Record<string, string>[]> {
  const rows = await getSheetData(range);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0] ?? [];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

export async function getSheetNames(): Promise<string[]> {
  const sheets = createSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
  });

  return res.data.sheets?.map((sheet) => sheet.properties?.title ?? "").filter(Boolean) ?? [];
}
