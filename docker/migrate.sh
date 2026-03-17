#!/bin/bash
# StreamHub Migration Script
# Menghapus Ant Media Server dan memindahkan StreamHub ke port 80/443 dengan SSL
# Usage: bash migrate.sh <domain> <email>
set -e

DOMAIN="${1:-studioserver.space}"
EMAIL="${2:-admin@studioserver.space}"

echo "========================================"
echo "  StreamHub Migration Script"
echo "  Domain : $DOMAIN"
echo "  Email  : $EMAIL"
echo "========================================"
echo ""
echo "PERINGATAN: Script ini akan MENGHAPUS Ant Media Server!"
echo "Pastikan streaming sudah dipindahkan ke StreamHub sebelum lanjut."
echo ""
read -p "Ketik 'YA' untuk melanjutkan: " CONFIRM
if [ "$CONFIRM" != "YA" ]; then
  echo "Dibatalkan."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=== [1/6] Menghentikan Ant Media Server ==="
systemctl stop antmedia 2>/dev/null || true
systemctl disable antmedia 2>/dev/null || true
echo "Ant Media Server dihentikan."

echo ""
echo "=== [2/6] Menghapus Ant Media Server ==="
if [ -d /usr/local/antmedia ]; then
  # Jalankan uninstall script jika ada
  if [ -f /usr/local/antmedia/uninstall.sh ]; then
    bash /usr/local/antmedia/uninstall.sh 2>/dev/null || true
  fi
  rm -rf /usr/local/antmedia
  echo "Ant Media Server dihapus dari /usr/local/antmedia."
else
  echo "Ant Media Server tidak ditemukan di /usr/local/antmedia, skip."
fi

# Hapus service file jika masih ada
rm -f /etc/systemd/system/antmedia.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true

echo ""
echo "=== [3/6] Membebaskan port 80 dan 443 ==="
# Stop nginx host yang mungkin dipakai Ant Media
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Stop container StreamHub yang lama
docker compose down 2>/dev/null || true

# Tunggu port 80 bebas
sleep 3
if ss -tuln | grep -q ':80 '; then
  echo "WARNING: Port 80 masih digunakan oleh proses lain:"
  ss -tuln | grep ':80 '
  echo "Coba kill paksa..."
  fuser -k 80/tcp 2>/dev/null || true
  sleep 2
fi
echo "Port 80 dan 443 bebas."

echo ""
echo "=== [4/6] Mendapatkan SSL Certificate ==="
mkdir -p certbot/conf

CERT_PATH="certbot/conf/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  echo "Certificate sudah ada, skip certbot."
else
  echo "Menjalankan certbot standalone..."
  docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email "${EMAIL}" \
    --agree-tos --no-eff-email \
    -d "${DOMAIN}"
  echo "SSL Certificate berhasil didapatkan!"
fi

echo ""
echo "=== [5/6] Mengupdate konfigurasi nginx ke port 80/443 ==="

# Update docker-compose.yml: kembalikan nginx ke port 80/443, hapus host network
cat > docker-compose.yml <<'COMPOSEOF'
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-streamhub}
      POSTGRES_USER: ${POSTGRES_USER:-streamhub}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-streamhub}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    restart: always
    environment:
      PORT: "3001"
      DATABASE_URL: postgresql://${POSTGRES_USER:-streamhub}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-streamhub}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      APP_DOMAIN: ${DOMAIN}
      FRONTEND_URL: https://${DOMAIN}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GOOGLE_CALLBACK_URL: https://${DOMAIN}/api/auth/google/callback
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    restart: always
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend

  certbot:
    image: certbot/certbot:latest
    volumes:
      - ./certbot/conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
COMPOSEOF

# Buat nginx.conf HTTPS
sed "s/\${DOMAIN}/${DOMAIN}/g" nginx-template.conf > nginx.conf
echo "nginx.conf HTTPS aktif."

echo ""
echo "=== [6/6] Menjalankan StreamHub di port 80/443 ==="

# Update .env dengan FRONTEND_URL yang benar (HTTPS)
if [ -f .env ]; then
  sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://'"${DOMAIN}"'|g' .env 2>/dev/null || true
fi

docker compose up -d
sleep 15

echo ""
echo "========================================"
echo "  Migrasi Selesai!"
echo "  App  : https://${DOMAIN}"
echo "  Admin: admin@streamhub.tv / admin123"
echo "========================================"
echo ""
echo "PENTING: Segera ganti password admin setelah login!"
