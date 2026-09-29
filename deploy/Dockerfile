# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/collaboration/package.json apps/collaboration/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm ci


FROM deps AS backend-build

COPY apps/backend apps/backend

RUN npm run build --workspace=backend
RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS backend

WORKDIR /app

ENV NODE_ENV=production

COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=backend-build /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "../../node_modules/.bin/typeorm migration:run -d dist/database/data-source.js && node dist/main.js"]


FROM deps AS collaboration-build

COPY apps/collaboration apps/collaboration

RUN npm run build --workspace=collaboration
RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS collaboration

WORKDIR /app

ENV NODE_ENV=production

COPY --from=collaboration-build /app/node_modules ./node_modules
COPY --from=collaboration-build /app/apps/collaboration/package.json ./apps/collaboration/package.json
COPY --from=collaboration-build /app/apps/collaboration/dist ./apps/collaboration/dist

WORKDIR /app/apps/collaboration

EXPOSE 1234

CMD ["node", "dist/main.js"]


FROM deps AS frontend-build

ARG VITE_API_URL=/api
ARG VITE_COLLABORATION_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_COLLABORATION_URL=${VITE_COLLABORATION_URL}

COPY apps/frontend apps/frontend

RUN test -n "$VITE_COLLABORATION_URL"
RUN npm run build --workspace=frontend


FROM nginx:alpine AS web

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
