FROM node:22-bookworm AS deps
WORKDIR /workspace
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspaces --include-workspace-root --install-strategy=nested

FROM node:22-bookworm AS builder
WORKDIR /workspace
COPY --from=deps /workspace ./
COPY . .
RUN npm run build -w client
RUN npm run build -w server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace=server
COPY --from=builder /workspace/server/dist ./server/dist
COPY --from=builder /workspace/client/dist ./client/dist
COPY --from=builder /workspace/client/public ./public

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/
EXPOSE 3000
ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
CMD ["node", "/app/server/dist/server.js"]

