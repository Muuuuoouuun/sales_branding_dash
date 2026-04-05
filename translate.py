import os

# Files to update
files = {
    "src/app/crm/page.tsx": {
        "BD operations cockpit": 'language === "ko" ? "BD 운영 조종석" : "BD operations cockpit"',
        "CRM Tactics": 'language === "ko" ? "CRM 전략" : "CRM Tactics"',
        "High-signal action queues, stage control, and lead context from the live CRM feed.": 'language === "ko" ? "실시간 CRM 피드에서 가져온 핵심 액션 큐, 스테이지 관리 및 리드 정보입니다." : "High-signal action queues, stage control, and lead context from the live CRM feed."',
        "export default function CRMPage() {": 'export default function CRMPage() {\n  const { language } = require("@/components/SettingsProvider").useSettings();'
    },
    "src/app/project/page.tsx": {
        "Strategic focus": 'language === "ko" ? "전략적 초점" : "Strategic focus"',
        "Project Setup": 'language === "ko" ? "프로젝트 설정" : "Project Setup"',
        "Define target accounts, regional priorities, and baseline targets to calibrate the dashboard.": 'language === "ko" ? "목표 고객사, 지역별 우선순위 및 기본 목표를 설정하여 대시보드를 보정하세요." : "Define target accounts, regional priorities, and baseline targets to calibrate the dashboard."',
        "export default function ProjectSetup() {": 'export default function ProjectSetup() {\n  const { language } = require("@/components/SettingsProvider").useSettings();'
    },
    "src/app/data/page.tsx": {
        "Source config": 'language === "ko" ? "소스 설정" : "Source config"',
        "Data Integration": 'language === "ko" ? "데이터 연동" : "Data Integration"',
        "Hook up Google Sheets or switch to fallback data for testing.": 'language === "ko" ? "테스트를 위해 구글 시트를 연동하거나 기본 데이터로 전환하세요." : "Hook up Google Sheets or switch to fallback data for testing."',
        "export default function ConfigPage() {": 'export default function ConfigPage() {\n  const { language } = require("@/components/SettingsProvider").useSettings();'
    },
    "src/app/research/page.tsx": {
        "Market intel": 'language === "ko" ? "시장 정보" : "Market intel"',
        "Prospecting Research": 'language === "ko" ? "잠재 고객 리서치" : "Prospecting Research"',
        "Find lookalike targets and scan news signals for your focus accounts.": 'language === "ko" ? "주요 타겟 고객사와 유사한 대상을 찾고 뉴스 신호를 스캔합니다." : "Find lookalike targets and scan news signals for your focus accounts."',
        "export default function ResearchPage() {": 'export default function ResearchPage() {\n  const { language } = require("@/components/SettingsProvider").useSettings();'
    },
    "src/app/report/page.tsx": {
        "Board sync": 'language === "ko" ? "임원 보고" : "Board sync"',
        "AI Strategy Report": 'language === "ko" ? "AI 전략 보고서" : "AI Strategy Report"',
        "Generate a structured narrative of the current pipeline, anomalies, and next steps for leadership.": 'language === "ko" ? "리더십을 위해 현재 파이프라인, 특이사항 및 향후 계획에 대한 구조화된 보고서를 생성합니다." : "Generate a structured narrative of the current pipeline, anomalies, and next steps for leadership."',
        "export default function ReportPage() {": 'export default function ReportPage() {\n  const { language } = require("@/components/SettingsProvider").useSettings();'
    }
}

for filepath, replacements in files.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply exact replacements. Need to carefully replace strings inside curly braces where appropriate.
    # Titles are mostly wrapped in tags like <h1 className={styles.title}>CRM Tactics</h1>
    # We should replace >Text< with >{language === 'ko' ? ...}<
    for old_text, new_expr in replacements.items():
        if "export default function" in old_text:
            if "const { language }" not in content:
                content = content.replace(old_text, new_expr)
        else:
            # Replaces exact >text< boundaries
            content = content.replace(f">{old_text}<", f">{{{new_expr}}}<")
            content = content.replace(f'"{old_text}"', f"{{{new_expr}}}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print(f"Translated {filepath}")
