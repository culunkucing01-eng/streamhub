# StreamHub — Panduan Deploy ke VPS

## Yang Kamu Butuhkan

| Kebutuhan | Keterangan |
|-----------|-----------|
| VPS | Ubuntu 20.04+ / Debian 11+, minimal 1 CPU & 1GB RAM |
| Domain | Domain yang sudah diarahkan A record ke IP VPS |
| Docker | Akan diinstall lewat script di bawah |

---

## Langkah 1 — Siapkan VPS

SSH ke VPS kamu, lalu install Docker:

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version
docker compose version
```

---

## Langkah 2 — Upload Kode ke VPS

**Opsi A — lewat Git (disarankan):**
```bash
git clone https://github.com/kamu/streamhub.git
cd streamhub
```

**Opsi B — lewat SCP dari komputer lokal:**
```bash
scp -r ./streamhub user@IP_VPS:/home/user/streamhub
ssh user@IP_VPS
cd streamhub
```

---

## Langkah 3 — Konfigurasi Environment

```bash
cd docker
cp .env.example .env
nano .env
```

Isi nilainya:

```env
# Domain kamu (tanpa https://)
DOMAIN=streamhub.domainmu.com

# Password database yang kuat
POSTGRES_PASSWORD=isi_password_kuat_disini

# JWT secret — generate dengan: openssl rand -hex 32
JWT_SECRET=isi_random_string_panjang_disini

# (Opsional) Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

> **Generate JWT secret:** `openssl rand -hex 32`

---

## Langkah 4 — Pastikan DNS Sudah Benar

Sebelum lanjut, pastikan domain kamu sudah mengarah ke IP VPS:

```bash
# Cek apakah domain sudah mengarah ke VPS kamu
nslookup streamhub.domainmu.com
# atau
dig +short streamhub.domainmu.com
```

Hasilnya harus menampilkan IP VPS kamu.

---

## Langkah 5 — Jalankan Setup Otomatis

```bash
# Dari direktori docker/
chmod +x setup.sh
./setup.sh
```

Script ini akan otomatis:
1. Konfigurasi Nginx dengan domain kamu
2. Mendapatkan sertifikat SSL gratis dari Let's Encrypt
3. Build dan jalankan semua service (backend, frontend, database, nginx)
4. Membuat akun-akun default

Setelah selesai, buka **https://domainmu.com** — aplikasi sudah berjalan!

---

## Akun Default

| Email | Password | Role |
|-------|----------|------|
| admin@streamhub.tv | admin123 | Admin |
| operator@streamhub.tv | operator123 | Operator |
| user@streamhub.tv | user123 | User |
| test@streamhub.tv | test123 | User |

> ⚠️ **Segera ganti password setelah login pertama!**

---

## (Opsional) Aktifkan Login with Google

Jika ingin Login with Google berfungsi di domain baru:

1. Buka [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit OAuth Client ID kamu
3. Tambahkan **Authorized redirect URI** baru:
   ```
   https://streamhub.domainmu.com/api/auth/google/callback
   ```
4. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di file `.env`
5. Restart backend: `docker compose restart backend`

---

## Integrasi SRS (Server Streaming)

Untuk streaming RTMP + HLS, install SRS di VPS yang sama atau terpisah:

```bash
docker run -d --name srs \
  --restart always \
  -p 1935:1935 \
  -p 1985:1985 \
  -p 8080:8080 \
  registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5 \
  ./objs/srs -c conf/docker.conf
```

Lalu update `.env`:
```env
SRS_API_URL=http://IP_VPS_SRS:1985
SRS_PLAYBACK_URL=http://IP_VPS_SRS:8080
```

---

## Arsitektur

```
Internet
    │
    ▼
[Nginx :80/:443]  ← SSL/TLS (Let's Encrypt)
    ├── /api/*  ──────► [Backend :3001] ──► [PostgreSQL :5432]
    ├── /live/* ──────► [SRS :8080]
    └── /*      ──────► [Frontend :80]

[OBS/Encoder] ──RTMP──► [SRS :1935]
```

---

## Perintah Berguna

```bash
# Lihat log semua service
docker compose logs -f

# Lihat log service tertentu
docker compose logs -f backend
docker compose logs -f nginx

# Restart semua service
docker compose restart

# Restart service tertentu
docker compose restart backend

# Update aplikasi (setelah ada kode baru)
git pull
docker compose up -d --build

# Backup database
docker compose exec postgres pg_dump -U streamhub streamhub > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T postgres psql -U streamhub streamhub < backup.sql

# Perbarui sertifikat SSL secara manual
docker compose run --rm certbot renew
```

---

## Troubleshooting

**Nginx gagal start (SSL belum ada):**
```bash
# Jalankan ulang setup
./setup.sh
```

**Backend tidak bisa konek ke database:**
```bash
docker compose logs postgres
docker compose restart postgres
docker compose restart backend
```

**Port 80/443 sudah terpakai:**
```bash
sudo lsof -i :80
sudo systemctl stop apache2   # jika Apache aktif
sudo systemctl stop nginx      # jika Nginx sistem aktif
```

**Sertifikat SSL gagal (domain belum mengarah ke VPS):**
```bash
# Cek IP yang terresolve
dig +short domainmu.com
# Harus sama dengan IP VPS kamu
curl ifconfig.me
```
