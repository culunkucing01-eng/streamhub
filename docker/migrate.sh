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
read -p "Ketik 'YA' untuk melanjutkan: " CONFIRM
if [ "$CONFIRM" != "YA" ]; then
  echo "Dibatalkan."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=== [1/6] Menghentikan SEMUA layanan di port 80 dan 443 ==="

# Hentikan semua service yang mungkin pakai port 80/443
for SVC in antmedia nginx apache2 httpd lighttpd caddy; do
  systemctl stop "$SVC" 2>/dev/null && echo "Stopped: $SVC" || true
  systemctl disable "$SVC" 2>/dev/null || true
done

# Hentikan semua Docker container
docker compose down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# Kill paksa semua proses di port 80 dan 443
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
sleep 3

# Verifikasi port 80 benar-benar kosong
if ss -tuln | grep -q ' :80 \| :80$'; then
  echo "ERROR: Port 80 masih digunakan!"
  ss -tuln | grep ':80'
  echo "Coba lagi paksa..."
  fuser -k -9 80/tcp 2>/dev/null || true
  sleep 2
fi

PORT80_STATUS=$(ss -tuln | grep ' :80' | wc -l)
if [ "$PORT80_STATUS" -gt "0" ]; then
  echo "GAGAL: Port 80 tidak bisa dikosongkan. Proses yang menggunakan:"
  lsof -i :80 2>/dev/null || ss -tuln | grep ':80'
  exit 1
fi
echo "Port 80 dan 443 KOSONG."

echo ""
echo "=== [2/6] Menghapus Ant Media Server ==="
AMS_DIRS="/usr/local/antmedia /opt/antmedia /home/antmedia"
for DIR in $AMS_DIRS; do
  if [ -d "$DIR" ]; then
    if [ -f "$DIR/uninstall.sh" ]; then
      bash "$DIR/uninstall.sh" 2>/dev/null || true
    fi
    rm -rf "$DIR"
    echo "Dihapus: $DIR"
  fi
done
rm -f /etc/systemd/system/antmedia*.service /lib/systemd/system/antmedia*.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true
echo "Ant Media Server dihapus."

echo ""
echo "=== [3/6] Mendapatkan SSL Certificate ==="
mkdir -p certbot/conf

CERT_PATH="certbot/conf/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  echo "Certificate sudah ada, skip certbot."
else
  # Install certbot langsung di host (lebih reliable dari Docker)
  if ! command -v certbot &>/dev/null; then
    echo "Menginstall certbot..."
    apt-get update -qq
    apt-get install -y certbot
  fi

  echo "Menjalankan certbot standalone..."
  certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}"

  # Symlink ke folder certbot Docker
  mkdir -p certbot/conf/live
  ln -sf /etc/letsencrypt/live certbot/conf/live 2>/dev/null || true
  ln -sf /etc/letsencrypt/archive certbot/conf/archive 2>/dev/null || true
  ln -sf /etc/letsencrypt certbot/conf 2>/dev/null || true
  echo "SSL Certificate berhasil!"
fi

echo ""
echo "=== [4/6] Mengupdate nginx.conf ke HTTPS ==="

# Buat nginx-template.conf yang pakai /etc/letsencrypt langsung
cat > nginx.conf <<NGINXEOF
worker_processes auto;
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    upstream backend  { server backend:3001; }
    upstream frontend { server frontend:80; }

    server {
        listen 80;
        server_name ${DOMAIN};
        location / { return 301 https://\$host\$request_uri; }
    }

    server {
        listen 443 ssl;
        http2 on;
        server_name ${DOMAIN};

        ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
NGINXEOF

echo "nginx.conf HTTPS siap."

echo ""
echo "=== [5/6] Update docker-compose.yml ==="
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
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
COMPOSEOF

echo ""
echo "=== [6/6] Menjalankan StreamHub ==="
docker compose up -d
sleep 20

echo ""
echo "========================================"
echo "  Migrasi Selesai!"
echo "  App  : https://${DOMAIN}"
echo "  Admin: admin@streamhub.tv / admin123"
echo "========================================"
echo "PENTING: Segera ganti password admin setelah login!"
