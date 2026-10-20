# API 서버 실행 이미지 (저장소 루트에서 빌드)
#   서버:        docker build -f apps/api/Dockerfile -t field-note-api .
#   DB 마이그레이션: docker build -f apps/api/Dockerfile --target migrate -t field-note-migrate .
# 소스를 tsx로 바로 실행하므로 별도 컴파일 단계가 없다. 네이티브 모듈(argon2·sharp)이 미리 빌드된
# glibc 이미지를 쓴다 (alpine은 musl이라 피함)

# ---- 공통 바탕: openssl은 Prisma가, ca-certificates는 DB·저장소·메일 서버의 TLS 연결이 필요로 함
FROM node:24-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

# ---- 개발 도구까지 설치해 Prisma 클라이언트를 만드는 단계 (이 단계의 도구는 서버 이미지에 넣지 않음)
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@field-note/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
# tsconfig가 상속하는 공용 설정 (설정 패키지 전체는 린트 도구까지 끌고 오므로 이 파일만 복사해 경로를 바꿈)
COPY packages/config/tsconfig.base.json packages/config/
RUN sed -i 's#@field-note/config/tsconfig.base.json#../../packages/config/tsconfig.base.json#' apps/api/tsconfig.json
# Prisma 클라이언트는 저장소에 없어서(`src/generated`) 여기서 만든다
RUN pnpm --filter @field-note/api exec prisma generate

# ---- DB 마이그레이션 작업용: prisma CLI가 있어 `pnpm --filter @field-note/api db:setup`(마이그레이션 적용과
# 계정 비밀번호 설정)을 실행할 수 있다. 배포 때 소유 계정 접속 값으로 한 번 실행하고 서버에는 쓰지 않음
FROM build AS migrate
USER node
# 실행할 때마다 pnpm을 내려받지 않도록 이미지를 만들 때 미리 받아 둠
RUN pnpm --version
CMD ["pnpm", "--filter", "@field-note/api", "db:setup"]

# ---- 점검 작업용: 마이그레이션 이미지에 PostgreSQL 클라이언트 도구(pg_dump·pg_restore)를 더한 것
# 백업·복구 시험·해지 회사 삭제(`pnpm backup`, `pnpm operator purge-due`)를 컨테이너 안에서 실행한다.
# 도구는 DB 서버와 같은 주 버전(18)이어야 해서 PostgreSQL 공식 저장소에서 받는다
#   docker build -f apps/api/Dockerfile --target ops -t field-note-ops .
FROM build AS ops
RUN apt-get update  && apt-get install -y --no-install-recommends curl gnupg  && install -d /usr/share/postgresql-common/pgdg  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc  && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list  && apt-get update  && apt-get install -y --no-install-recommends postgresql-client-18  && apt-get purge -y --auto-remove curl gnupg  && rm -rf /var/lib/apt/lists/*
USER node
RUN pnpm --version
CMD ["pnpm", "backup", "list"]

# ---- 서버 이미지 (마지막 단계라 기본 빌드 대상): 운영 의존성만 설치
FROM base AS runtime
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter "@field-note/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY --from=build /app/packages/config/tsconfig.base.json packages/config/tsconfig.base.json
COPY --from=build /app/apps/api/tsconfig.json apps/api/tsconfig.json
COPY --from=build /app/apps/api/src/generated apps/api/src/generated

WORKDIR /app/apps/api
ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

# 루트 권한으로 돌지 않게 일반 사용자로 실행 (앱 폴더는 읽기만 하므로 소유권을 바꿔 층을 복제하지 않음)
USER node

# 헬스 체크: 서버가 요청에 응답하는지 (DB 연결 등은 서버 기동 때 검사)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# node를 직접 실행해 종료 신호(SIGTERM)를 서버가 바로 받아 정리한 뒤 끝나게 함
CMD ["node", "--import", "tsx", "src/main.ts"]
