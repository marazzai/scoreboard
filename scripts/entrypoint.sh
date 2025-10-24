#!/usr/bin/env sh
set -e

# Ensure Prisma client is generated and DB schema is pushed at container start.
# This runs in the runtime image where filesystem is writable.

echo "[entrypoint] Generating Prisma client (if needed)..."
# generate client if possible
npx prisma generate || true

echo "[entrypoint] Pushing Prisma schema to database (db push)..."
# push schema - creates the SQLite file if it doesn't exist
npx prisma db push || true

echo "[entrypoint] Starting server"
exec node server.js
