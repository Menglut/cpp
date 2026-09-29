#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

env_file=${ENV_FILE:-.env.production}
compose_file=${COMPOSE_FILE:-compose.prod.yaml}
backup_root=${BACKUP_DIR:-backups}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="$backup_root/$timestamp"

if [ ! -f "$env_file" ]; then
  echo "Missing $env_file." >&2
  exit 1
fi

mkdir -p "$destination"

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

echo "Backing up application PostgreSQL..."
compose exec -T app-db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$destination/cppstudy.sql"

echo "Backing up uploaded media..."
compose exec -T api tar -czf - -C /app/uploads . \
  > "$destination/uploads.tar.gz"

cat > "$destination/README.txt" <<EOF
CppStudy backup created at $timestamp (UTC).

Contains:
- cppstudy.sql: application database dump
- uploads.tar.gz: administrator-uploaded media

Judge0's internal job database is intentionally not backed up. It contains
temporary execution state rather than CppStudy learning and content data.
EOF

echo "Backup completed: $destination"
echo "Copy this directory to storage outside the server."
