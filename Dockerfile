FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .
RUN npm run build

RUN npm prune --production

RUN apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

FROM node:20-slim AS runtime

WORKDIR /app

COPY package*.json ./

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/.kube

EXPOSE 3001

CMD ["node", "server/index.js"]

