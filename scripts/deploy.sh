#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

env_file=${ENV_FILE:-.env.production}
compose_file=${COMPOSE_FILE:-compose.prod.yaml}

if [ ! -f "$env_file" ]; then
  echo "Missing $env_file. Copy .env.production.example and set real values." >&2
  exit 1
fi

if [ ! -f deploy/judge0.conf ]; then
  echo "Missing deploy/judge0.conf. Copy deploy/judge0.conf.example and set real values." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

echo "Validating production configuration..."
compose config --quiet

echo "Building application images..."
compose build web api app-worker migrate

echo "Starting databases and queues..."
compose up -d --wait app-db app-redis judge0-db judge0-redis

echo "Starting Judge0..."
compose up -d --wait judge0-server judge0-workers

echo "Applying database migrations..."
compose run --rm migrate

echo "Starting CppStudy..."
compose up -d --wait api app-worker web caddy

echo "Deployment finished. Current service status:"
compose ps
