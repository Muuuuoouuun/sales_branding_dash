# Google Sheets 컬럼 매핑 가이드

대시보드가 읽는 Google Sheets 구조 및 각 시트의 컬럼 해석 기준을 정리한 문서입니다.
코드 변경 전 반드시 이 문서를 참고하세요.

---

## 시트 목록

| 상수 | 시트명 | 범위 | 용도 |
|---|---|---|---|
| `DSH_RANGE` | `1. DSH` | `A1:V200` | BD팀 목표/실적 (팀·매니저 레벨) |
| `SEG_RANGE` | `2. SEG` | `A1:AZ100` | 지역별 목표·월별 매출 집계 |
| `REV_RANGE` | `3. REV` | `A1:CZ400` | 개별 고객사 계약·매출 상세 |
| `KPI_RANGE` | `4. KPI` | `A1:AZ60` | 활동 KPI (목표/실적) |

---

## 2. SEG 시트 — DSH 보조용 (히트맵에 사용 안 함)

> ⛔ **히트맵에 SEG 데이터를 사용하지 않습니다. REV 시트 전용입니다.**
> SEG는 Goal/Status 섹션이 나란히 있는 요약 시트로, REV와 구조가 근본적으로 다릅니다.

> SEG는 지역별 요약 시트입니다. 범위 `A1:S40` (col A~S, row 1~40).

### 주요 컬럼
| 열 | 0-based index | 내용 |
|---|---|---|
| L | 11 | Goal 섹션 지역명 |
| M | 12 | Goal 섹션 목표 금액 |
| Q | 16 | Status 섹션 지역명 |
| R | 17 | Status 섹션 현재 금액 |

- `rows.slice(3)` 로 데이터 시작 (상위 3행 = 헤더)
- `parseSegRows` 함수에서만 사용 — DSH 보조 계산 용도

### ⚠️ SEG를 히트맵에 쓰면 안 되는 이유
- R열(Status)이 Goal(M열)과 동일한 값이 들어오는 경우가 있어 달성률이 100%처럼 보임
- REV 시트에 월별 실납부 데이터가 있으므로 SEG 폴백이 불필요함
- SEG 파싱 로직을 REV 컬럼 방식으로 변경하면 DSH/BD Target Tracker 포함 전체 대시보드가 깨짐

---

## 3. REV 시트 — 개별 고객사 상세

### 주요 컬럼
| 열 | 0-based index | 내용 |
|---|---|---|
| A | 0 | 고객사명 |
| C | 2 | 팀 (BD 필터링 기준) |
| D | 3 | 담당 매니저 |
| E | 4 | 유형 (Direct / Channel) |
| F | 5 | 상태 (New / Renew) |
| G | 6 | 첫 납부일 (firstPayment) — 확정 여부 판단 기준 |
| H | 7 | 버전 |
| I | 8 | **지역** (SEG 지역명과 동일 키값 사용) |
| K | 10 | 중요도 (KA / A / B) |
| L | 11 | 비고 |
| M | 12 | **계약 목표 금액** (실매출 아님 — 합산 시 주의) |
| N+ | 13+ | 월별 집계 (Row 2 헤더 기준, SEG와 동일 구조 추정) |

> ⚠️ **주의**: M열은 계약 목표치이지 실매출이 아닙니다.
> `firstPayment`가 있는 행의 M열을 합산하면 목표 ≈ 매출처럼 보이는 버그가 발생합니다.
> 실매출은 월별 집계 컬럼(빨간색 확정 셀)에서 읽어야 합니다.

---

## 1. DSH 시트 — 팀·매니저 목표/실적

### 구조 (상단 섹션, rows 0–24)
- 좌측 Goal 섹션 (A–F), Fixed Goal 섹션 (H–P), Status 섹션 (R–Z)
- `col I (8)` = Fixed Goal Sum, `col S (18)` = Status Sum
- 행 레이블 (col A): `"Sum"`, `"Han"`, `"Wangchan"`, `"Junhyuk"`

### 구조 (하단 상세, rows 25+)
- 매니저별 블록: col A = 매니저명
- 각 블록 내 `col B = "Total"` 행이 두 번 등장:
  - 1번째 Total = **Goal Total** (목표)
  - 2번째 Total = **Status Total** (실적)
- 연간: col F (5), 분기별: col G–J (Q1=6, Q2=7, Q3=8, Q4=9)
- 월별: col K–V (index 10–21), 회계월 순서 `[4,5,6,7,8,9,10,11,12,1,2,3]`

---

## 4. KPI 시트 — 활동 지표

| 열 범위 | 내용 |
|---|---|
| col A (0) | 멤버명 |
| col B–F (1–5) | 활동 목표: LD, ACC, OPP, SOL, VST |
| col V–Z (21–25) | 활동 실적: LD, ACC, OPP, SOL, VST |

---

## 히트맵 계산 원칙 (REV 전용)

```
regionTarget   = REV M열 합산 (전체 딜, firstPayment 무관)
regionRevenue  = REV monthTotals 합산 (firstPayment 있는 딜만, 현재 회계월까지)
regionRevenueM = 이번 달(calendarMonth) monthTotals 합산
regionRevenueQ = 이번 분기 월 중 현재월까지 monthTotals 합산
달성률          = regionRevenue / regionTarget × 100
```

M/Q/Y 토글: `page.tsx`의 `heatmapRegions` useMemo에서 `displayRevenue/displayTarget/displayProgress` 파생.

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-07 | 히트맵 regionRevenue: REV M열 합산 → REV monthTotals 합산으로 수정 (target≈revenue 버그 수정) |
| 2026-04-07 | SEG 히트맵 사용 중단 — REV 전용으로 전환 |
| 2026-04-07 | 히트맵 M/Q/Y 토글 추가, RegionDrilldown 탭 레이아웃(실행포인트/확정계약/파이프라인) 적용 |
| 2026-04-07 | focusAccounts/topAccounts/deriveRegionAccounts slice 제한 제거 |
