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

echo "=== [1/7] Writing .env ==="
cat > .env <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
DOMAIN=${DOMAIN}
NODE_ENV=production
EOF

echo "=== [2/7] Rebuilding images ==="
docker compose pull postgres nginx certbot 2>/dev/null || true
docker compose build --no-cache backend frontend

echo "=== [3/7] Starting with HTTP-only nginx (no SSL yet) ==="
cp nginx-http.conf nginx.conf

# Stop all containers and remove postgres volume to fix password mismatch
docker compose down --remove-orphans --volumes 2>/dev/null || true
docker volume rm docker_postgres_data 2>/dev/null || true

docker compose up -d postgres backend frontend nginx

echo "Waiting 45s for database init and backend migrations..."
sleep 45

echo "=== [4/7] Seeding database ==="
docker compose exec backend node seed.cjs && echo "Seed OK" || echo "Seed skipped (may already be seeded)"

echo "=== [5/7] Obtaining SSL certificate ==="
CERT_PATH="certbot/conf/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  echo "Certificate already exists, skipping certbot."
else
  mkdir -p certbot/www certbot/conf

  # Verify nginx is serving the webroot correctly
  mkdir -p certbot/www/.well-known/acme-challenge
  echo "ok" > certbot/www/.well-known/acme-challenge/test
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/.well-known/acme-challenge/test" 2>/dev/null || echo "000")
  rm -f certbot/www/.well-known/acme-challenge/test

  if [ "$HTTP_STATUS" != "200" ]; then
    echo "WARNING: nginx webroot test failed (HTTP $HTTP_STATUS). Certbot may fail."
    echo "Check that port 80 is open and nginx is running."
  else
    echo "Nginx webroot OK (HTTP 200). Running certbot..."
  fi

  docker run --rm \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    certbot/certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos --no-eff-email \
    -d "${DOMAIN}"
  echo "Certificate obtained."
fi

echo "=== [6/7] Switching nginx to HTTPS config ==="
sed "s/\${DOMAIN}/${DOMAIN}/g" nginx-template.conf > nginx.conf
docker compose restart nginx
echo "HTTPS nginx activated."

echo "=== [7/7] Done! ==="
echo ""
echo "  App:    https://${DOMAIN}"
echo "  Admin:  admin@streamhub.tv / admin123"
echo ""
echo "Change the admin password after first login!"
