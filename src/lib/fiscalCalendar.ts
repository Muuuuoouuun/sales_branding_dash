const DEFAULT_TIME_ZONE = "Asia/Seoul";

export type FiscalQuarter = 1 | 2 | 3 | 4;

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
}

export interface FiscalCalendarInfo {
  calendarYear: number;
  calendarMonth: number;
  calendarDay: number;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalQuarter: FiscalQuarter;
  fiscalQuarterMonths: [number, number, number];
  fiscalMonthIndex: number;
  monthPeriod: string;
  fiscalYearLabel: string;
  fiscalQuarterLabel: string;
}

function getFiscalQuarterMonths(fiscalQuarter: FiscalQuarter): [number, number, number] {
  if (fiscalQuarter === 1) {
    return [4, 5, 6];
  }

  if (fiscalQuarter === 2) {
    return [7, 8, 9];
  }

  if (fiscalQuarter === 3) {
    return [10, 11, 12];
  }

  return [1, 2, 3];
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Unable to derive zoned date parts for ${timeZone}.`);
  }

  return { year, month, day };
}

function getFiscalQuarterFromMonth(month: number): FiscalQuarter {
  if (month >= 4 && month <= 6) {
    return 1;
  }

  if (month >= 7 && month <= 9) {
    return 2;
  }

  if (month >= 10 && month <= 12) {
    return 3;
  }

  return 4;
}

function getFiscalYearRange(year: number, month: number): { start: number; end: number } {
  if (month >= 4) {
    return { start: year, end: year + 1 };
  }

  return { start: year - 1, end: year };
}

function getFiscalMonthIndex(month: number): number {
  return month >= 4 ? month - 3 : month + 9;
}

function toTwoDigitYear(year: number): string {
  return String(year).slice(-2);
}

export function getFiscalCalendarInfo(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): FiscalCalendarInfo {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const fiscalYear = getFiscalYearRange(year, month);
  const fiscalQuarter = getFiscalQuarterFromMonth(month);
  const fiscalMonthIndex = getFiscalMonthIndex(month);
  const monthPeriod = `${year}-${String(month).padStart(2, "0")}-01`;
  const fiscalYearLabel = `FY${toTwoDigitYear(fiscalYear.start)}-${toTwoDigitYear(fiscalYear.end)}`;

  return {
    calendarYear: year,
    calendarMonth: month,
    calendarDay: day,
    fiscalYearStart: fiscalYear.start,
    fiscalYearEnd: fiscalYear.end,
    fiscalQuarter,
    fiscalQuarterMonths: getFiscalQuarterMonths(fiscalQuarter),
    fiscalMonthIndex,
    monthPeriod,
    fiscalYearLabel,
    fiscalQuarterLabel: `${fiscalYearLabel} Q${fiscalQuarter}`,
  };
}

export function getCurrentMonthPeriod(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return getFiscalCalendarInfo(date, timeZone).monthPeriod;
}

export function getCurrentFiscalQuarterLabel(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return getFiscalCalendarInfo(date, timeZone).fiscalQuarterLabel;
}

export function getCurrentFiscalQuarterMonths(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): [number, number, number] {
  return getFiscalCalendarInfo(date, timeZone).fiscalQuarterMonths;
}
