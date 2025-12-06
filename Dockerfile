FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install dependencies (using npm install for better cross-arch compatibility)
RUN npm install

COPY . .
RUN npm run build

# Clean up build dependencies after build
RUN apk del python3 make g++

FROM node:20-alpine AS runtime

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install production dependencies
# Use npm install instead of npm ci for better cross-arch compatibility with native modules
RUN npm install --only=production && \
    npm cache clean --force

# Clean up build dependencies
RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/.kube

EXPOSE 3001

CMD ["node", "server/index.js"]

