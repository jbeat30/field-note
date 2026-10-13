# 0.8.0 UI/UX 개편 작업 인계 메모

다른 PC·새 세션에서 이어서 작업하기 위한 현재 상태 기록. 작업이 끝나면 이 문서는 지우고 `03-progress.md`에 옮긴다

## 작업 위치

- 브랜치 `feat-project-redesign` (`feature/0.8.0`에서 분기), 전부 로컬 커밋이며 아직 푸시·PR 하지 않음
- 사용자 방침: UI/UX 개편은 사용자가 로컬 화면을 보고 OK 하기 전에는 푸시·PR 금지. 요청은 사용자가 나눠서 하며, 요청한 항목부터 처리
- 현장·대표 관점: 프로젝트가 관리의 기본 단위. "일지"와 "오늘 내 현장" 개념은 쓰지 않음. 날짜별 작업 내역 안에서 사람마다 일한 시간이 다를 수 있음

## 다른 PC에서 시작하는 순서

- `pnpm install` → `pnpm infra:up` → `pnpm env:init` (비밀 값은 그 PC에서 새로 생성, `.env` 복사 금지) → `pnpm db:setup` → `pnpm db:seed`
- 화면 확인: `cd apps/web && pnpm exec vite --mode mock --port 5173 --host` (로그인 `hanbit` / `Hanbit-demo-2026!`)
- Storybook 첫 실행 전 `pnpm --filter @field-note/web exec playwright install chromium`

## 이번 개편에서 한 일

- 디자인 시스템 정비: 버튼·입력·선택·체크·라디오·알림·칩·배지·표를 같은 토큰(`index.css`의 `--radius-control`, `--control-border` 등)으로 통일. 새 컴포넌트 `combobox`(cmdk), `tooltip`, `dropdown-menu`, `label`. 전체 모음은 Storybook `Foundations/컴포넌트 모음`
- 프로젝트 목록·직원·고객: 서버 쪽 쪽 나누기·정렬·검색(디바운스 300ms, 요청 취소), TanStack Table, 명부 삭제 API
- 프로젝트 작업 공간(`layouts/ProjectLayout.tsx`): 메뉴 `작업 달력 · 현황 · 인원 · 자재 · 사진 · 메모 · 문서 · 공수·인건비 · 추가 공사 · 마감·보증 · 정보 수정`. 마감·보증 안에서는 하위 메뉴(마감 요약·보수·보증·일보 출력)가 따로 나옴
- 작업 달력(`routes/ProjectWorkPage.tsx`, `workLogs/ProjectWorkCalendar.tsx`): 월 달력에서 날짜마다 일한 사람 수·시간·이름이 보이고, 눌러서 그날 작업(`/projects/:id/work/:date`)으로 이동. 아래에 기록한 날 표
  - API: `WorkLogSummary.workers`(직원별 분) 추가 (shared `workLogs.ts`, `workLogService.ts`, 목업 `handlers.ts`, openapi 재생성)
- 하루 작업(`workLogs/WorkLogEditor.tsx`): 빈 상태로 시작하고 회사 직원 중에서 콤보박스로 골라 추가(프로젝트 팀 직원이 먼저 보임), "프로젝트 팀 N명 모두 넣기" 버튼, 사람마다 시간을 따로 입력. 팀 밖 직원을 넣고 저장하면 기존대로 투입 자동 추가 확인
- 인원(`projects/ProjectAssignmentsPanel.tsx`, `workSummary/ProjectWorkerTable.tsx`): "프로젝트 팀"에 직원 추가(콤보박스, 기간·계획 공수는 접힌 선택 칸), 팀에서 빼기. 옆에 전체 기간 동안 누가 며칠·몇 시간 일했는지 정리 표
- 자재(`routes/ProjectMaterialsPage.tsx`): 입력을 하루 작업 화면에서 자재 메뉴로 이동. 날짜를 골라 그날 자재를 기록, 잔량·전체 기록은 그대로. 하루 작업 화면에는 자재 메뉴로 가는 안내만 남김 (`?date=` 지원)
- 진행 단계(`projects/ProjectStatusPanel.tsx`): 5단계 표시(예정→진행→완료→보증→종료), 주요 전환 버튼과 "그 밖의 처리"(중단·취소) 분리, 이력은 접기
- 보증(`routes/ProjectWarrantyPage.tsx`): 상태 카드와 남은 일수 배지, 설정·보증서 2열, 이력 접기

## 검증 상태 (마지막 확인)

- 통과: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`(1214개), `pnpm test:stories`(408개, 접근성 포함)
- 아직 안 돌림: `pnpm build`, Playwright e2e
  - e2e(`apps/web/e2e/coreFlow.spec.ts`, `dailyLogTiming.spec.ts`)는 옛 구조(하루 작업이 팀 전원으로 미리 채워짐, 투입 폼의 셀렉트·"투입 등록" 버튼, 자재를 하루 작업에서 입력)를 가정하므로 새 구조에 맞게 고쳐야 함

## 남은 일

- e2e 수정 후 `pnpm build`와 e2e 통과 확인
- 새 화면(작업 달력·인원·자재·보증·진행 단계)을 Chromium으로 실제 확인하고 스크린샷으로 밝게·어둡게·모바일 점검
- 사진: 하루 작업 화면에서 올리기, 프로젝트 목록 열(최근 작업일·이번 달 시간), 홈의 "오늘의 투입" 위젯 정리
- 컴포넌트 적용 확대: 프로젝트·고객·담당자 선택에 콤보박스, 행 작업에 더보기 메뉴
- 문서 갱신: README, `04-data-model.md`(스키마 변경은 없음), `03-progress.md`, `06-field-ux.md`의 작업 달력·인원 설명
- 사용자 OK 후: `feature/0.8.0` 대상 PR (커밋은 카테고리별로 나눠 둠)
- 사용자가 아직 확정하지 않은 설계: 일자별 투입 "계획"(미리 정하는 인원)은 따로 두지 않고 실제 기록만 남기는 방식으로 구현함. 계획 단계가 필요한지 사용자에게 확인
