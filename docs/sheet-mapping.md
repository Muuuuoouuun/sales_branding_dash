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

## 2. SEG 시트 — 지역 히트맵 기준

> SEG는 지역별 요약 시트입니다. 범위 `A1:S40` (col A~S, row 1~40).

### 주요 컬럼
| 열 | 0-based index | 내용 |
|---|---|---|
| L | 11 | **Goal 섹션 지역명** |
| M | 12 | **Goal 섹션 목표 금액** (히트맵 target) |
| Q | 16 | **Status 섹션 지역명** |
| R | 17 | **Status 섹션 현재 금액** (히트맵 revenue 폴백) |

- `rows.slice(3)` 로 데이터 시작 (상위 3행 = 헤더)
- Goal 지역(L열)과 Status 지역(Q열)이 같은 이름을 사용해야 REV 데이터와 매칭됨

### 히트맵 매출 계산 로직
```
지역 목표  = SEG L/M열 → goal 섹션 목표 금액
지역 매출  = REV monthTotals 현재월까지 합산 (firstPayment 확정 건만)
           → 없으면 SEG R열 status 금액으로 폴백
달성률     = 지역 매출 / 지역 목표 × 100
```

> ⚠️ SEG의 R열(Status)을 그대로 사용하면 Goal과 같은 값이 들어오는 경우가 있어 달성률이 100%처럼 보일 수 있음. REV monthly 데이터를 우선 사용할 것.

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

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-07 | 히트맵 regionRevenue 계산: REV M열(계약 목표치) 합산 → REV monthTotals 현재월까지 합산으로 수정 |
