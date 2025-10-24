#!/usr/bin/env sh
set -e

# Ensure Prisma client is generated and DB schema is pushed at container start.
# This runs in the runtime image where filesystem is writable.

echo "[entrypoint] Pushing Prisma schema to database (db push)..."
echo "[entrypoint] Starting server"
echo "[entrypoint] Locating Prisma schema..."
SCHEMA_PATH=""
for p in ./prisma/schema.prisma ./schema.prisma /app/prisma/schema.prisma /app/schema.prisma; do
	if [ -f "$p" ]; then
		SCHEMA_PATH="$p"
		break
	fi
done

if [ -z "$SCHEMA_PATH" ]; then
	echo "[entrypoint] Prisma schema not found in default locations, attempting to continue without schema (this may fail)"
else
	echo "[entrypoint] Found Prisma schema at: $SCHEMA_PATH"
	echo "[entrypoint] Generating Prisma client (if needed)..."
	npx prisma generate --schema="$SCHEMA_PATH" || true

	echo "[entrypoint] Pushing Prisma schema to database (db push)..."
	npx prisma db push --schema="$SCHEMA_PATH" || true
fi

echo "[entrypoint] Starting server"
exec node server.js
