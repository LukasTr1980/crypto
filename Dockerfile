FROM node:22-bookworm AS deps
WORKDIR /workspace
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci --workspaces --include-workspace-root --omit=dev

FROM deps AS build
COPY client client
COPY server server
COPY tsconfig.base.json .
RUN npm run build -w client && npm run build -w server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY server/package.json server/
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=build /workspace/server/dist ./server/dist
COPY --from=build /workspace/client/dist ./client/dist
COPY --from=build /workspace/client/public ./public
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/

EXPOSE 3000
ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
CMD ["node", "/app/server/dist/server.js"]
