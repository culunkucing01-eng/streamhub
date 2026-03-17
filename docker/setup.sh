#!/bin/bash
set -e

# ============================================================
# StreamHub VPS Setup Script
# Jalankan sekali di VPS untuk setup lengkap dengan SSL
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

# ============================================================
echo ""
echo "  ██████ ████████ ██████  ███████  █████  ███    ███ ██   ██ ██    ██ ██████  "
echo " ██         ██    ██   ██ ██      ██   ██ ████  ████ ██   ██ ██    ██ ██   ██ "
echo " ███████    ██    ██████  █████   ███████ ██ ████ ██ ███████ ██    ██ ██████  "
echo "      ██    ██    ██   ██ ██      ██   ██ ██  ██  ██ ██   ██ ██    ██ ██   ██ "
echo " ██████     ██    ██   ██ ███████ ██   ██ ██      ██ ██   ██  ██████  ██████  "
echo ""
echo "  StreamHub VPS Setup Script"
echo "============================================================"
echo ""

# Cek .env ada
if [ ! -f .env ]; then
    error ".env tidak ditemukan! Jalankan: cp .env.example .env && nano .env"
fi

# Load env
set -a; source .env; set +a

# Validasi env vars wajib
[ -z "$DOMAIN" ] && error "DOMAIN belum diisi di .env"
[ -z "$POSTGRES_PASSWORD" ] && error "POSTGRES_PASSWORD belum diisi di .env"
[ -z "$JWT_SECRET" ] && error "JWT_SECRET belum diisi di .env"

info "Domain: $DOMAIN"
info "Memulai setup..."
echo ""

# === STEP 1: Buat nginx.conf dengan domain yang benar ===
info "Konfigurasi Nginx untuk domain $DOMAIN..."

# Buat nginx HTTP-only sementara untuk mendapatkan sertifikat
cat > nginx-temp.conf << EOF
worker_processes auto;
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name ${DOMAIN};
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'StreamHub is being set up...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Ganti DOMAIN_PLACEHOLDER di nginx.conf dengan domain asli
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx-template.conf > nginx.conf
log "nginx.conf dikonfigurasi"

# === STEP 2: Buat direktori certbot ===
mkdir -p certbot/www certbot/conf
log "Direktori certbot dibuat"

# === STEP 3: Jalankan nginx sementara untuk validasi SSL ===
info "Menjalankan nginx sementara untuk validasi SSL..."
cp nginx.conf nginx-final.conf
cp nginx-temp.conf nginx.conf

docker compose up -d nginx
sleep 3

# === STEP 4: Dapatkan sertifikat SSL ===
info "Mendapatkan sertifikat SSL dari Let's Encrypt untuk $DOMAIN..."
docker compose run --rm --entrypoint certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@${DOMAIN} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

if [ $? -ne 0 ]; then
    warn "Gagal mendapatkan sertifikat SSL otomatis."
    warn "Pastikan domain $DOMAIN mengarah ke IP VPS ini."
    warn "Coba lagi dengan: certbot certonly --webroot -w certbot/www -d $DOMAIN"
    cp nginx-final.conf nginx.conf
    error "Setup dibatalkan. Perbaiki DNS dulu lalu jalankan ulang."
fi

# Kembalikan nginx.conf ke versi HTTPS
cp nginx-final.conf nginx.conf
rm -f nginx-temp.conf nginx-final.conf
log "Sertifikat SSL berhasil diperoleh"

# === STEP 5: Build dan jalankan semua service ===
info "Build dan menjalankan semua service..."
docker compose down
docker compose up -d --build
log "Semua service berjalan"

# === STEP 6: Tunggu database siap ===
info "Menunggu database siap..."
sleep 10

# === STEP 7: Seed database ===
info "Membuat akun default..."
docker compose exec backend node seed.cjs
log "Akun default dibuat"

echo ""
echo "============================================================"
log "Setup selesai!"
echo ""
echo "  Aplikasi tersedia di: https://${DOMAIN}"
echo ""
echo "  Akun Default:"
echo "  ┌─────────────────────────────┬───────────────┬──────────┐"
echo "  │ Email                       │ Password      │ Role     │"
echo "  ├─────────────────────────────┼───────────────┼──────────┤"
echo "  │ admin@streamhub.tv          │ admin123      │ Admin    │"
echo "  │ operator@streamhub.tv       │ operator123   │ Operator │"
echo "  │ user@streamhub.tv           │ user123       │ User     │"
echo "  │ test@streamhub.tv           │ test123       │ User     │"
echo "  └─────────────────────────────┴───────────────┴──────────┘"
echo ""
warn "Segera ganti password setelah login pertama!"
echo ""
echo "  Perintah berguna:"
echo "  docker compose logs -f          → lihat log"
echo "  docker compose restart          → restart semua"
echo "  docker compose exec backend node seed.cjs → tambah ulang akun"
echo "============================================================"
