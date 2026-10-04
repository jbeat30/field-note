# 진행 현황 (이어서 작업용)

> 마지막 갱신: 2026-10-04 · 현재 작업 버전: **0.1.0 (기술 0 — 준비)**
> 작업을 마칠 때마다 이 문서를 갱신한다 (기능 브랜치 PR에 포함).

## 1. 한눈에 보기

| 항목                               | 상태                                                |
| ---------------------------------- | --------------------------------------------------- |
| 0단계 기획서 분석                  | 완료 (`00-analysis.md`)                             |
| 1단계 개발 순서 설계               | 완료 (`01-development-plan.md`)                     |
| 2단계 모노레포 기본 구성 + 첫 푸시 | 완료 (T0-1)                                         |
| 브랜치·PR·버전 전략                | 완료·강제 적용 (`02-git-workflow.md`)               |
| **다음 작업**                      | **T0-3 로컬 인프라** (브랜치 예: `feat-env-logger`) |

## 2. 기술 0 진행표 (버전 0.1.0)

| ID       | 작업                                                                            | 상태            |
| -------- | ------------------------------------------------------------------------------- | --------------- |
| T0-1     | 모노레포 기본 구성                                                              | 완료            |
| T0-2     | husky + lint-staged + CI                                                        | 완료            |
| (추가)   | 브랜치 전략 · PR 방향 검사 · 릴리즈 워크플로 · dev 스크립트 수정                | 완료 (PR #1~#3) |
| **T0-3** | docker-compose(PostgreSQL 18, MinIO, Mailpit), env 검증(Zod), pino 로거(마스킹) | **다음**        |
| T0-4     | DB·격리 스파이크 (Prisma 7.10.0, `withCompany`, RLS, 격리 테스트) — 최대 위험   | 대기            |
| T0-5     | API 공통 틀 (validate, requireAuth, 에러 형식, 멱등 키, OpenAPI)                | 대기            |
| T0-6     | 웹 공통 틀 (Tailwind, Router, Query/Zustand, PWA, Storybook)                    | 대기            |
| T0-7     | 세션·로그인 틀                                                                  | 대기            |
| 릴리즈   | T0-7 완료 후 `release/0.1.0` → `main`, `package.json` 버전을 0.1.0으로 올림     | 대기            |

## 3. Git 상태

| 브랜치          | 위치       | 설명                                                                    |
| --------------- | ---------- | ----------------------------------------------------------------------- |
| `main`          | `ee14498`  | 규칙 적용 전 직접 푸시한 초기 구성(T0-1, T0-2). 이후 릴리즈 PR로만 변경 |
| `feature/0.1.0` | `ac34d8c`+ | 0.1.0 작업 브랜치. main보다 PR #1~#3만큼 앞섬                           |

- 원격: `git@github.com:jbeat30/field-note.git` (**SSH**. HTTPS는 키체인의 다른 계정 `kangjubit`으로 403)
- GitHub 룰셋(관리자 우회 없음): `main 보호`, `feature·release 보호` — PR 필수, 체크 `verify`·`branch-policy` 필수, 삭제·강제 푸시 금지
- 병합 PR: #1 브랜치 전략, #2 dev 스크립트 수정, #3 브랜치 이름 규칙
- 현재 `package.json` 버전은 `0.0.0` (릴리즈 브랜치에서 올림. 0.0.0이면 릴리즈 워크플로가 건너뜀)

## 4. 이어서 작업하는 방법

```bash
cd /Users/gangjubich/new_project/field-note
git checkout feature/0.1.0 && git pull origin feature/0.1.0
git checkout -b feat-env-logger          # 작업명 중심 브랜치
# ...작업, 커밋(타입: 한국어 설명)...
git push -u origin feat-env-logger
gh pr create --base feature/0.1.0        # CI 통과 후 squash 머지
```

- 커밋 전 훅이 ESLint·Prettier를 실행한다. 클론 직후 1회 `pnpm prepare` 필요
- 검증: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`
- 로컬 확인: `pnpm dev` → web http://localhost:5173, api http://localhost:3000/api/v1/health

## 5. 환경 주의

| 항목          | 내용                                                                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm          | 프로젝트는 **12.9.1** 고정. 이 PC 기본은 9.14.4/8.15.6이라 corepack(0.22)으로 12를 못 씀. 이전 작업은 임시 경로에 설치한 12.9.1로 진행했고 임시 경로는 세션이 끝나면 사라지므로 `npm i -g pnpm@12.9.1` 또는 `npm i --prefix ~/.local/pnpm12 pnpm@12.9.1` 후 PATH 지정이 필요 |
| Node          | `.nvmrc`=24, `engines >=24`. 이 PC는 26.0.0 (nvm에는 20.12.2뿐)                                                                                                                                                                                                              |
| Docker        | 이 PC에 없음. T0-3의 compose 파일은 작성만 가능하고 실행 검증은 Docker 설치 후                                                                                                                                                                                               |
| 빌드 스크립트 | pnpm 12는 설치 스크립트를 막음 → `pnpm-workspace.yaml`의 `allowBuilds`에 새 네이티브 패키지(argon2, sharp, 프리즈마 등) 추가 필요                                                                                                                                            |
| 훅            | pnpm 12에서 `pnpm install`이 `prepare`를 실행하지 않는 것으로 보임 → `pnpm prepare` 수동                                                                                                                                                                                     |

## 6. 결정 대기

| 항목                                                     | 시점              |
| -------------------------------------------------------- | ----------------- |
| Docker 설치 여부 (T0-3 검증, T0-4 Testcontainers에 필수) | T0-3 시작 전 확인 |
| 호스팅·이메일·객체 저장소 공급자                         | 스테이징 구성 전  |
| 사진 정책(압축·HEIC·위치정보)                            | P2 시작 전        |
| 계정 복구 본인 확인 방법                                 | P0 후반           |

## 7. 알려진 사항

- `docs/planning/`의 두 기획서는 원본 그대로이며 Prettier 대상에서 제외
- T0-4의 Testcontainers 격리 테스트는 Docker가 필요해서 CI(ubuntu)에서는 돌지만 이 PC에서는 Docker 설치 전까지 실행 불가
