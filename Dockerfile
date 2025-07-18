FROM node:22-bookworm AS base
WORKDIR /workspace

FROM base AS deps
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY . .
RUN npm run build -w client
RUN npm run build -w server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace=server --ignore-scripts && npm cache clean --force
COPY --from=build /workspace/server/dist ./server/dist
COPY --from=build /workspace/client/dist ./client/dist
COPY --from=build /workspace/client/public ./public

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/
EXPOSE 3000
ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
CMD ["node", "/app/server/dist/server.js"]

