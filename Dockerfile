
# ---------- Builder Stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
# Using --no-scripts to avoid busybox trigger issues in multi-arch builds
RUN apk add --no-cache --no-scripts \
    python3 \
    build-base \
    && rm -rf /var/cache/apk/*

COPY package*.json ./

# Run npm audit before installing to check for vulnerabilities
RUN npm audit --audit-level=moderate || true

RUN npm install

# Run npm audit fix for fixable vulnerabilities
RUN npm audit fix --force || true

COPY . .

RUN npm run build

RUN npm prune --production

# Note: Build dependencies (python3, build-base) are not removed here
# because they're in the builder stage and won't be in the final image anyway.
# Removing them can cause busybox trigger issues in multi-arch builds.

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

RUN mkdir -p /app/.kube && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

CMD ["node", "server/index.js"]
