
# ---------- Builder Stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ bash

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

RUN apk del python3 make g++ bash

# ---------- Runtime Stage ----------
FROM node:20-alpine AS runtime

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
