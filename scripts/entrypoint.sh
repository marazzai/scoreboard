#!/usr/bin/env sh
set -e

# Ensure Prisma client is generated and DB schema is pushed at container start.
# This runs in the runtime image where filesystem is writable.

echo "[entrypoint] Locating Prisma schema..."
SCHEMA_PATH=""
for p in ./prisma/schema.prisma ./schema.prisma /app/prisma/schema.prisma /app/schema.prisma; do
	if [ -f "$p" ]; then
		SCHEMA_PATH="$p"
		break
	fi
done

# Prepare SQLite directory based on DATABASE_URL (file:/... or file:./...)
DB_URL="${DATABASE_URL:-}"
if [ -n "$DB_URL" ]; then
	case "$DB_URL" in
		file:*)
			DB_PATH=${DB_URL#file:}
			;;
		*)
			DB_PATH=""
			;;
	esac
	if [ -n "$DB_PATH" ]; then
		# Normalize relative path
		case "$DB_PATH" in
			./*)
				DB_PATH="/app/${DB_PATH#./}"
				;;
		esac
		DB_DIR=$(dirname "$DB_PATH")
		if [ ! -d "$DB_DIR" ]; then
			echo "[entrypoint] Creating DB directory: $DB_DIR"
			mkdir -p "$DB_DIR"
		fi
	fi
fi

if [ -z "$SCHEMA_PATH" ]; then
	echo "[entrypoint] Prisma schema not found in default locations; continuing without schema (app may fail on DB access)"
else
	echo "[entrypoint] Found Prisma schema at: $SCHEMA_PATH"
	echo "[entrypoint] Generating Prisma client (if needed)..."
	npx prisma generate --schema="$SCHEMA_PATH" || true

	echo "[entrypoint] Pushing Prisma schema to database (db push)..."
	npx prisma db push --schema="$SCHEMA_PATH" || true
fi

echo "[entrypoint] Starting server"
exec node server.js
