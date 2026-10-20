# 웹 이미지 (정적 웹 + Caddy), 저장소 루트에서 빌드
#   docker build -f deploy/web.Dockerfile -t field-note-web .
# 빌드 결과(apps/web/dist)와 deploy/Caddyfile을 Caddy 이미지에 담는다. 웹 빌드에는 비밀 값이 없다

# ---- 웹 빌드
FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "@field-note/web..."
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @field-note/web build

# ---- 실행: 정적 파일은 읽기 전용으로 제공
FROM caddy:2.11.7-alpine AS runtime
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
