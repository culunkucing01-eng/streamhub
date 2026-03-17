#!/bin/bash
# StreamHub Full Deployment Script
# Usage: bash deploy.sh <domain> <email> <postgres_password> <jwt_secret>
set -e

DOMAIN="${1:-studioserver.space}"
EMAIL="${2:-admin@studioserver.space}"
POSTGRES_PASSWORD="${3}"
JWT_SECRET="${4}"

if [ -z "$POSTGRES_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
  echo "Usage: bash deploy.sh <domain> <email> <postgres_password> <jwt_secret>"
  echo "Example: bash deploy.sh studioserver.space admin@studioserver.space mypassword123 mysecretkey"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== [1/6] Writing .env ==="
cat > .env <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
DOMAIN=${DOMAIN}
NODE_ENV=production
EOF

echo "=== [2/6] Rebuilding images ==="
docker compose build --no-cache backend frontend

echo "=== [3/6] Starting services (HTTP only, no nginx yet) ==="
docker compose down --remove-orphans --volumes 2>/dev/null || true
docker volume rm docker_postgres_data 2>/dev/null || true

# Start backend, frontend, postgres — but NOT nginx yet (certbot needs port 80)
docker compose up -d postgres backend frontend

echo "Waiting 45s for database init and backend migrations..."
sleep 45

echo "=== [4/6] Seeding database ==="
docker compose exec backend node seed.cjs && echo "Seed OK" || echo "Seed skipped (may already be seeded)"

echo "=== [5/6] Obtaining SSL certificate (standalone mode) ==="
mkdir -p certbot/conf

CERT_PATH="certbot/conf/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  echo "Certificate already exists, skipping certbot."
else
  echo "Running certbot standalone on port 80..."
  docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email "${EMAIL}" \
    --agree-tos --no-eff-email \
    -d "${DOMAIN}"
  echo "Certificate obtained!"
fi

echo "=== [6/6] Starting nginx with HTTPS ==="
sed "s/\${DOMAIN}/${DOMAIN}/g" nginx-template.conf > nginx.conf
docker compose up -d nginx certbot

echo ""
echo "==============================="
echo "  Deployment complete!"
echo "  App: https://${DOMAIN}"
echo "  Admin: admin@streamhub.tv / admin123"
echo "==============================="
echo "Change the admin password after first login!"
