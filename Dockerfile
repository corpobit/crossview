FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci && \
    apk del python3 make g++

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    npm cache clean --force && \
    apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/.kube

EXPOSE 3001

CMD ["node", "server/index.js"]

