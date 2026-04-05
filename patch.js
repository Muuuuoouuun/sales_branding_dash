const fs = require('fs');

const dataPagePath = 'src/app/data/page.tsx';
let dataPage = fs.readFileSync(dataPagePath, 'utf8');

const neoCrmConfig = `  {
    id: "neocrm",
    name: "Neo CRM (销售易)",
    desc: "중국 Neo CRM 연동",
    color: "#e60012",
    status: "disconnected",
    fields: [
      { key: "tenantId", label: "Tenant ID" },
      { key: "appId", label: "App ID" },
      { key: "appSecret", label: "App Secret", type: "password" },
      { key: "endpoint", label: "API Endpoint", type: "url" }
    ],
  },
`;

dataPage = dataPage.replace('const INITIAL_PLATFORMS: CrmPlatform[] = [', 'const INITIAL_PLATFORMS: CrmPlatform[] = [\n' + neoCrmConfig);
fs.writeFileSync(dataPagePath, dataPage);

const routePath = 'src/app/api/crm/leads/route.ts';
let route = fs.readFileSync(routePath, 'utf8');

const fetchLogic = `
  const raw = loadCSV<LeadRow>('leads.csv');

  // ── [Neo CRM 연동 뼈대] ──────────────────────────────────────────────────
  const USE_NEO_CRM = process.env.NEO_CRM_ENABLED === 'true';
  let leadsData = raw;

  if (USE_NEO_CRM) {
    try {
      // TODO: Neo CRM (Xiaoshouyi 등) 연동 로직
      // 1. Token 발급 (AppId, AppSecret)
      // 2. Lead 리스트 조회 API 호출
      // const res = await fetch("https://api.xiaoshouyi.com/rest/data/v2.0/query...", { ... });
      // const neoData = await res.json();
      
      // leadsData = neoData.records.map(record => ({
      //   id: record.id, company: record.accountName, ...
      // }));
    } catch (e) {
      console.error("Neo CRM 연동 실패:", e);
      leadsData = raw; // 에러 시 기존 CSV 폴백
    }
  }

  const leads = leadsData.map(l => ({`;

route = route.replace("  const raw = loadCSV<LeadRow>('leads.csv');\n\n  const leads = raw.map(l => ({", fetchLogic);
fs.writeFileSync(routePath, route);
console.log('Patch applied.');
