# Multi-stage build for Next.js + custom Node server
# Use Debian-based images to avoid Prisma/Alpine openssl issues

FROM node:20-bullseye-slim AS builder
WORKDIR /app
ENV CI=true
# Install all dependencies (including dev) in the builder so Next.js build has everything it needs
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

# Increase Node's memory limit during build to avoid OOM failures on small hosts
ENV NODE_OPTIONS=--max_old_space_size=8192

# Build Next.js (stable builder)
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Default runtime DATABASE_URL (can be overridden by compose env). Keep DB inside container
ENV DATABASE_URL="file:/app/var/db/dev.db"
# Install only production deps in the runner
COPY package*.json ./
RUN npm ci --omit=dev
# Ensure prisma CLI is available; generation and db push will run at container startup
RUN npx prisma generate || true

# Copy built app and required runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/socket-server.js ./socket-server.js
COPY --from=builder /app/src ./src
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/prisma ./prisma
# Also copy schema to project root so prisma CLI can find it via default paths
COPY --from=builder /app/prisma/schema.prisma ./schema.prisma
# Copy generated Prisma client and runtime from builder to runner so @prisma/client is available
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Ensure internal DB directory exists inside the image
RUN mkdir -p /app/var/db

# Expose the web port
EXPOSE 3000

# Healthcheck: try fetching the root page
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Copy entrypoint script and make it executable
COPY ./scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

# Use entrypoint to ensure DB is initialized then start the server
ENTRYPOINT ["/bin/sh", "./scripts/entrypoint.sh"]
