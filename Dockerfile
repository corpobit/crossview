FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install dependencies (using npm install for better cross-arch compatibility)
RUN npm install

COPY . .
RUN npm run build

# Clean up build dependencies after build
RUN apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

FROM node:20-slim AS runtime

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install production dependencies
# Use npm install instead of npm ci for better cross-arch compatibility with native modules
RUN npm install --only=production && \
    npm cache clean --force

# Clean up build dependencies
RUN apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/.kube

EXPOSE 3001

CMD ["node", "server/index.js"]

