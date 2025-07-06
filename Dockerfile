FROM node:22-bookworm AS builder
WORKDIR /workspace

COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm ci --prefix server
RUN npm ci --prefix client

COPY client ./client
RUN npm run build --prefix client

COPY server ./server
RUN npm run build --prefix server

FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev

COPY --from=builder /workspace/server/dist ./server/dist
COPY --from=builder /workspace/client/dist ./client/dist
COPY --from=builder /workspace/client/public ./public

COPY docker-entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
CMD ["node", "/app/server/dist/server.js"]

