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

FROM node:22-slim

ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev

COPY --from=builder /workspace/server/dist ./server/dist
COPY --from=builder /workspace/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/server"]

