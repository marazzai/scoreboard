# Multi-stage build for Next.js + custom Node server
# Use Debian-based images to avoid Prisma/Alpine openssl issues

FROM node:20-bullseye-slim AS deps
WORKDIR /app
ENV CI=true
COPY package*.json ./
RUN npm ci

FROM node:20-bullseye-slim AS builder
WORKDIR /app
ENV CI=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client (sqlite)
RUN npx prisma generate
# Increase Node's memory limit during build to avoid OOM failures on small hosts
ENV NODE_OPTIONS=--max_old_space_size=4096
# Build Next.js
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install only production deps (copy lockfile to preserve versions)
COPY package*.json ./
RUN npm ci --omit=dev

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
COPY --from=builder /app/data ./data

# Expose the web port
EXPOSE 3000

# Healthcheck: try fetching the root page
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the custom server (binds 0.0.0.0 inside)
CMD ["node", "server.js"]
