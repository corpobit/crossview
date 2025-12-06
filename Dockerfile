FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk update && apk add --no-cache python3 build-base

COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm install

COPY . .
RUN npm run build

# Install production dependencies only (for copying to runtime)
RUN npm prune --production

# Clean up build dependencies after build
RUN apk del python3 build-base

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production node_modules from builder
# This avoids needing to rebuild native modules in runtime stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built application files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /app/.kube

EXPOSE 3001

CMD ["node", "server/index.js"]

