# field-note

현장직 팀(판금·전기·목공 등)의 관리자가 프로젝트별 투입 인원·공수·작업일지·자재·사진을 수첩처럼 기록하는 서비스.

## 구성

| 경로              | 내용                             |
| ----------------- | -------------------------------- |
| `apps/web`        | React 19 + Vite 8 (SPA)          |
| `apps/api`        | Express 5 API 서버               |
| `packages/shared` | Zod 스키마, 공통 타입, 공수 계산 |
| `packages/config` | tsconfig·ESLint·Jest 공통 설정   |
| `docs`            | 기획서, 분석, 개발 순서 설계     |

## 시작하기

요구 사항: Node 24 이상, pnpm 12.9.1 (`packageManager` 고정)

```bash
pnpm install
pnpm prepare      # 커밋 훅(husky) 연결, 클론 후 1회
pnpm dev          # api :3000 + web :5173 (web은 /api를 api로 프록시)
pnpm dev:api      # api만
pnpm dev:web      # web만
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## 문서

- [기획서 분석](docs/00-analysis.md)
- [개발 순서 설계](docs/01-development-plan.md)
- [진행 현황](docs/03-progress.md)
- [서비스 기획서 v2.4](docs/planning/service-plan-v2.4.md) / [기술 기획서 v0.5](docs/planning/tech-plan-v0.5.md)
