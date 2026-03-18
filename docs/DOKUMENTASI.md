# StreamHub — Dokumentasi Lengkap

> Platform manajemen stasiun TV live streaming 24/7 berbasis self-hosted, dibangun dengan Node.js, React, PostgreSQL, dan SRS Media Server.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Fitur-Fitur](#2-fitur-fitur)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Tech Stack](#4-tech-stack)
5. [Struktur Proyek](#5-struktur-proyek)
6. [Konfigurasi Environment](#6-konfigurasi-environment)
7. [Panduan Deployment ke VPS](#7-panduan-deployment-ke-vps)
8. [Setup OBS / vMix](#8-setup-obs--vmix)
9. [Embed Player ke Website Lain](#9-embed-player-ke-website-lain)
10. [Manajemen Channel](#10-manajemen-channel)
11. [Sistem Billing](#11-sistem-billing)
12. [Role & Hak Akses](#12-role--hak-akses)
13. [API Reference](#13-api-reference)
14. [Database Schema](#14-database-schema)
15. [Akun Default](#15-akun-default)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Gambaran Umum

**StreamHub** adalah aplikasi web full-stack untuk mengelola stasiun TV komunitas berbasis live streaming yang berjalan 24/7 secara self-hosted di VPS sendiri. Sistem ini mengintegrasikan SRS (Simple Realtime Server) sebagai media server RTMP/HLS, dengan dashboard admin yang lengkap untuk mengelola channel, memantau stream, dan mengelola billing/langganan.

**URL Produksi:** `https://studioserver.space`  
**RTMP Ingest:** `rtmp://stream.studioserver.space/live`  
**VPS:** Hostinger KVM 2, Ubuntu, IP `31.97.51.250`

---

## 2. Fitur-Fitur

### Dashboard
- Ringkasan platform: jumlah channel aktif, total viewer, bitrate, uptime
- Grafik statistik stream dan viewer real-time
- Status koneksi SRS media server

### Manajemen Channel
- Buat, edit, hapus channel siaran
- Generate/regenerate stream key secara aman
- Tampilan lengkap URL OBS Setup, HLS, RTMP, WebRTC, dan Embed Code
- Salin URL/key dengan satu klik (tombol copy dengan feedback)

### Live Stream Monitoring
- Daftar stream yang sedang aktif secara real-time dari SRS
- Informasi per stream: viewer, bitrate, codec, uptime
- Auto-refresh setiap 10 detik

### Sistem Billing
- Manajemen paket/plan berlangganan (nama, harga, fitur, batas channel)
- Manajemen invoice per user
- Manajemen subscription (aktif/non-aktif, tanggal mulai/selesai)

### Server Monitor
- Statistik server real-time: CPU usage, RAM, uptime, network I/O
- Data langsung dari OS via SRS API

### Public Player
- Halaman player HLS publik di `/player/:id` — tanpa perlu login
- Support autoplay, fullscreen, mobile-friendly
- Badge LIVE dan status offline jika stream tidak aktif

### Embed Player
- Halaman player minimal di `/embed/:id` untuk di-embed ke website lain
- Mendukung autoplay, iframe-friendly, dark background
- Bisa di-embed ke mana saja via tag `<iframe>`

### Autentikasi
- Login email + password (JWT)
- Login via Google OAuth 2.0
- Register akun baru (langsung dapat role "user")
- Halaman profil user: edit nama, ganti password

---

## 3. Arsitektur Sistem

```
                    ┌─────────────────────────────────────┐
                    │         Cloudflare DNS               │
                    │  studioserver.space  (Proxied SSL)   │
                    │  stream.studioserver.space (DNS Only)│
                    └──────────────┬──────────────────────┘
                                   │ HTTPS port 443
                                   ▼
┌─────────────────────────────────────────────────────────┐
│                   VPS (31.97.51.250)                     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Nginx (network_mode: host)          │    │
│  │  :80 → redirect HTTPS                           │    │
│  │  :443 → /api/* → backend:3001                  │    │
│  │          /live/* → SRS:8080 (HLS)              │    │
│  │          /rtc/*  → SRS:1985 (WebRTC)           │    │
│  │          /*      → frontend:8079               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │   Backend    │  │     SRS      │  │
│  │  React+Vite  │  │  Express 5   │  │  Media Server│  │
│  │   :8079      │  │    :3001     │  │  :1935 RTMP  │  │
│  └──────────────┘  └──────┬───────┘  │  :8080 HLS   │  │
│                            │          │  :1985 API   │  │
│  ┌──────────────┐          │          └──────────────┘  │
│  │  PostgreSQL  │◄─────────┘                            │
│  │    :5432     │                                        │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
         ▲
         │ RTMP (port 1935, bypass Cloudflare)
         │ rtmp://stream.studioserver.space/live
         │
    ┌────┴──────┐
    │  OBS/vMix │
    └───────────┘
```

**Alur Streaming:**
1. OBS/vMix mengirim RTMP ke `rtmp://stream.studioserver.space/live/{stream-key}`
2. SRS menerima RTMP dan mengkonversi ke HLS (`.m3u8`)
3. Viewer mengakses HLS via `https://studioserver.space/live/{stream-key}.m3u8`
4. Nginx memproxy `/live/*` ke SRS port 8080

---

## 4. Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | React 19, Vite, TailwindCSS, Framer Motion, Recharts, HLS.js |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL 16 + Drizzle ORM |
| Validasi | Zod v4, drizzle-zod |
| Auth | JWT (jsonwebtoken), bcryptjs, Passport.js (Google OAuth) |
| Media Server | SRS (Simple Realtime Server) v5 |
| Reverse Proxy | Nginx (Alpine) |
| Kontainerisasi | Docker + Docker Compose |
| SSL | Let's Encrypt + Certbot (domain), Cloudflare (CDN) |
| Monorepo | pnpm workspaces |
| API Codegen | Orval (dari OpenAPI 3.1 spec) |

---

## 5. Struktur Proyek

```
streamhub/
├── artifacts/
│   ├── api-server/              # Express API server
│   │   └── src/
│   │       ├── index.ts         # Entry point
│   │       ├── lib/auth.ts      # JWT middleware & helpers
│   │       └── routes/
│   │           ├── auth.ts      # Login, register, profile
│   │           ├── auth-google.ts  # Google OAuth
│   │           ├── channels.ts  # Channel CRUD
│   │           ├── streams.ts   # SRS stream monitoring
│   │           ├── billing.ts   # Plans, invoices, subscriptions
│   │           └── server.ts    # OS/server stats
│   └── web/                     # React frontend
│       └── src/
│           ├── App.tsx          # Router & route guards
│           ├── hooks/use-auth.tsx  # Auth context
│           ├── components/layout.tsx  # Sidebar layout
│           └── pages/
│               ├── login.tsx    # Login + Register
│               ├── dashboard.tsx
│               ├── channels.tsx
│               ├── streams.tsx
│               ├── server.tsx
│               ├── profile.tsx
│               ├── public-player.tsx
│               ├── embed-player.tsx
│               └── billing/
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 spec
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod request schemas
│   └── db/                      # Drizzle ORM schema & connection
│       └── src/schema/
│           ├── users.ts
│           ├── channels.ts
│           ├── plans.ts
│           ├── subscriptions.ts
│           ├── invoices.ts
│           └── viewer_analytics.ts
├── docker/
│   ├── docker-compose.yml       # Orchestrasi semua service
│   ├── nginx.conf               # Reverse proxy config
│   ├── srs.conf                 # SRS media server config
│   ├── Dockerfile.backend       # Build image backend
│   ├── Dockerfile.frontend      # Build image frontend (Nginx)
│   └── .env.example             # Template environment variables
└── scripts/
    └── src/seed.ts              # Seed database (akun default)
```

---

## 6. Konfigurasi Environment

File `.env` disimpan di `docker/.env` pada VPS. Buat dari template:
```bash
cp docker/.env.example docker/.env
nano docker/.env
```

### Variabel Wajib

| Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `POSTGRES_PASSWORD` | `supersecretpassword` | Password database PostgreSQL |
| `JWT_SECRET` | `64-karakter-random-hex` | Secret untuk signing JWT token |
| `DOMAIN` | `studioserver.space` | Domain utama aplikasi |

### Variabel Opsional

| Variabel | Default | Keterangan |
|---|---|---|
| `POSTGRES_DB` | `streamhub` | Nama database |
| `POSTGRES_USER` | `streamhub` | Username database |
| `RTMP_DOMAIN` | `stream.studioserver.space` | Domain untuk RTMP ingest (harus DNS-only di Cloudflare) |
| `GOOGLE_CLIENT_ID` | *(kosong)* | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | *(kosong)* | Client Secret Google OAuth |

### Generate JWT_SECRET

```bash
openssl rand -hex 32
```

### Contoh file `.env` lengkap

```env
POSTGRES_DB=streamhub
POSTGRES_USER=streamhub
POSTGRES_PASSWORD=ganti_dengan_password_kuat

JWT_SECRET=isi_dengan_64_karakter_hex_random

DOMAIN=studioserver.space
RTMP_DOMAIN=stream.studioserver.space

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

---

## 7. Panduan Deployment ke VPS

### Prasyarat

- VPS Ubuntu 20.04+ (disarankan Hostinger KVM 2 atau setara)
- Domain dengan Cloudflare DNS
- Akses SSH root ke VPS

### Langkah 1 — Setup DNS Cloudflare

Buat dua record di Cloudflare dashboard:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `A` | `studioserver.space` | `31.97.51.250` | ✅ Proxied (orange cloud) |
| `A` | `stream` | `31.97.51.250` | ⬜ DNS Only (grey cloud) |

> **PENTING:** Record `stream.studioserver.space` HARUS DNS-Only (grey cloud), bukan proxied. Cloudflare memblokir port 1935 (RTMP).

Cloudflare SSL/TLS mode: **Full (Strict)**

### Langkah 2 — Install Dependencies di VPS

```bash
# Update sistem
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verifikasi
docker --version
docker compose version
```

### Langkah 3 — Clone Repository

```bash
cd /root
git clone https://github.com/culunkucing01-eng/streamhub.git
cd streamhub
```

### Langkah 4 — Buat File .env

```bash
cp docker/.env.example docker/.env
nano docker/.env
# Isi semua variabel yang diperlukan (lihat bagian 6)
```

### Langkah 5 — Setup SSL (Let's Encrypt)

```bash
# Install certbot
apt install certbot -y

# Stop semua service yang pakai port 80 dulu
# Minta sertifikat
certbot certonly --standalone -d studioserver.space -d www.studioserver.space

# Verifikasi sertifikat berhasil dibuat
ls /etc/letsencrypt/live/studioserver.space/
```

### Langkah 6 — Build & Jalankan Semua Service

```bash
cd /root/streamhub/docker

# Build semua image (pertama kali agak lama ~5-10 menit)
docker compose build

# Jalankan semua service
docker compose up -d

# Lihat status container
docker compose ps

# Lihat log jika ada masalah
docker compose logs -f backend
```

### Langkah 7 — Seed Database (Akun Default)

```bash
# Tunggu backend siap (~15 detik setelah container up)
sleep 15

# Jalankan seed untuk membuat akun admin, operator, user default
docker compose exec backend node -e "
const { seed } = require('./dist/scripts/seed');
seed().then(() => process.exit(0)).catch(console.error);
"
```

> Atau jalankan migration + seed via script jika tersedia:
> ```bash
> docker compose exec backend sh -c "node dist/index.js migrate && node dist/index.js seed"
> ```

### Update Aplikasi

Setiap ada perubahan kode, update VPS dengan cara:

```bash
cd /root/streamhub
git pull

cd docker
docker compose build backend frontend
docker compose up -d backend frontend
```

Jika git pull "Already up to date" tapi ada perubahan baru, update file langsung via heredoc (lihat panduan di chat history).

### Perpanjang SSL Otomatis

Tambahkan cron job untuk auto-renew sertifikat:

```bash
crontab -e
# Tambahkan baris ini:
0 3 * * * certbot renew --quiet && docker exec docker-nginx-1 nginx -s reload
```

---

## 8. Setup OBS / vMix

### Konfigurasi di OBS Studio

1. Buka OBS Studio
2. Pergi ke **Settings → Stream**
3. Pilih **Service: Custom...**
4. Isi field berikut:

| Field | Nilai |
|---|---|
| **Server** | `rtmp://stream.studioserver.space/live` |
| **Stream Key** | *(salin dari halaman Channels di dashboard)* |

5. Klik **OK**, lalu klik **Start Streaming**

> **Kenapa pakai `stream.studioserver.space`?**  
> Karena subdomain ini dikonfigurasi sebagai DNS-Only di Cloudflare (grey cloud), sehingga traffic RTMP port 1935 bisa langsung mencapai VPS. Jika pakai domain utama yang diproxy Cloudflare, port 1935 akan diblokir.

### Pengaturan Output yang Disarankan

**Settings → Output → Streaming:**
- Encoder: `x264` atau hardware (NVENC/AMF jika ada GPU)
- Bitrate: `2500–4000 Kbps` (sesuaikan dengan kecepatan upload)
- Keyframe Interval: `2` detik (WAJIB untuk HLS)
- CPU Usage Preset: `veryfast` atau `superfast`

**Settings → Video:**
- Base Resolution: `1920x1080`
- Output Resolution: `1280x720` (720p) atau `1920x1080` (1080p)
- FPS: `30`

### Konfigurasi di vMix

1. Klik **Add Input** → **Stream/SRT**
2. Pilih **RTMP**
3. Isi URL: `rtmp://stream.studioserver.space/live/{stream-key}`
4. Atau gunakan field terpisah: Server = `rtmp://stream.studioserver.space/live`, Key = `{stream-key}`

---

## 9. Embed Player ke Website Lain

Setiap channel memiliki embed player yang bisa dipasang di website mana saja.

### Cara Mendapatkan Kode Embed

1. Login ke dashboard StreamHub
2. Buka halaman **Channels**
3. Di card channel yang diinginkan, lihat bagian **"Embed ke Website"**
4. Salin **Kode Iframe** yang tersedia

### Contoh Kode Iframe

```html
<iframe 
  src="https://studioserver.space/embed/1" 
  width="1280" 
  height="720" 
  frameborder="0" 
  allow="autoplay; fullscreen" 
  allowfullscreen>
</iframe>
```

### URL Embed Langsung

```
https://studioserver.space/embed/{channel-id}
```

Bisa dibuka langsung di browser atau di-embed di mana saja.

### Fitur Embed Player

- Autoplay otomatis saat stream aktif
- Badge **LIVE** berwarna merah saat streaming
- Pesan "Stream Offline" saat tidak ada stream
- Dark background, cocok untuk embed di website mana saja
- Responsive (mengikuti ukuran container)

---

## 10. Manajemen Channel

### Membuat Channel Baru

1. Buka halaman **Channels**
2. Klik tombol **New Channel** (kanan atas)
3. Isi nama channel dan deskripsi
4. Klik **Create Channel**
5. Stream key akan di-generate otomatis

### Informasi yang Tersedia per Channel

| Info | Keterangan |
|---|---|
| **Server URL** | `rtmp://stream.studioserver.space/live` — untuk OBS Server field |
| **Stream Key** | Key unik tiap channel — untuk OBS Stream Key field |
| **RTMP URL (full)** | `rtmp://stream.studioserver.space/live/{key}` — jika OBS perlu URL lengkap |
| **HLS URL** | `https://studioserver.space/live/{key}.m3u8` — untuk player |
| **WebRTC URL** | `https://studioserver.space/rtc/v1/whep/?app=live&stream={key}` |
| **Embed Code** | Tag `<iframe>` siap pakai |
| **Public Player** | Link ke halaman player publik |

### Regenerate Stream Key

Klik tombol **Regenerate** di samping field Stream Key. Key lama langsung tidak berlaku, OBS harus diupdate dengan key baru.

### Aktif / Non-aktif Channel

Edit channel (klik ikon gear ⚙️) dan centang/hapus centang **Channel Active**.

---

## 11. Sistem Billing

### Plans (Paket Berlangganan)

Admin bisa membuat paket berlangganan di halaman **Plans**:
- Nama paket, harga, deskripsi
- Batas jumlah channel yang bisa dibuat
- Status aktif/non-aktif

### Invoices

Halaman **Invoices** mengelola tagihan per user:
- Nomor invoice, jumlah, status (paid/unpaid/overdue)
- Tanggal jatuh tempo

### Subscriptions

Halaman **Subscriptions** mengelola data langganan aktif:
- User yang berlangganan, paket yang dipilih
- Tanggal mulai dan berakhir
- Status subscription

> **Catatan:** Sistem billing saat ini adalah manajemen data manual. Integrasi payment gateway (Stripe/Midtrans) belum terpasang.

---

## 12. Role & Hak Akses

| Role | Keterangan | Akses |
|---|---|---|
| **admin** | Administrator penuh | Semua fitur: channel, billing, users, server monitor, regenerate key |
| **operator** | Operator siaran | Kelola channel, lihat stream, regenerate key — tidak bisa kelola billing |
| **user** | User biasa | Lihat channel dan stream saja, tidak bisa create/edit/delete |

### Catatan Penting

- Registrasi baru selalu mendapat role **user**
- Untuk mengubah role, admin harus update langsung di database:
  ```sql
  UPDATE users SET role = 'operator' WHERE email = 'user@example.com';
  ```
- Login Google OAuth juga mendapat role **user** secara default
- Akun Google OAuth tidak bisa ganti password lewat UI (tidak ada password)

---

## 13. API Reference

Semua endpoint API diakses dengan prefix `/api`. Token JWT dikirim via header:
```
Authorization: Bearer {token}
```

### Authentication

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login dengan email + password |
| `POST` | `/api/auth/register` | ❌ | Daftar akun baru (role: user) |
| `GET` | `/api/auth/me` | ✅ | Info user yang sedang login |
| `PUT` | `/api/auth/profile` | ✅ | Update nama / ganti password |
| `GET` | `/api/auth/google` | ❌ | Mulai flow Google OAuth |
| `GET` | `/api/auth/google/callback` | ❌ | Callback Google OAuth |
| `GET` | `/api/users` | ✅ Admin | Daftar semua user |

### Channels

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/channels` | ✅ | Daftar semua channel |
| `POST` | `/api/channels` | ✅ Admin/Op | Buat channel baru |
| `GET` | `/api/channels/:id` | ✅ | Detail channel |
| `PUT` | `/api/channels/:id` | ✅ Admin/Op | Update channel |
| `DELETE` | `/api/channels/:id` | ✅ Admin | Hapus channel |
| `POST` | `/api/channels/:id/regenerate-key` | ✅ Admin/Op | Regenerate stream key |
| `GET` | `/api/channels/public/:id` | ❌ | Info channel publik (tanpa stream key) |

### Streams

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/streams/active` | ✅ | Stream yang sedang live dari SRS |
| `GET` | `/api/streams/stats` | ✅ | Statistik stream dari SRS |

### Billing

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/billing/plans` | ✅ | Daftar paket |
| `POST` | `/api/billing/plans` | ✅ Admin | Buat paket baru |
| `GET` | `/api/billing/invoices` | ✅ | Daftar invoice |
| `POST` | `/api/billing/invoices` | ✅ Admin | Buat invoice |
| `GET` | `/api/billing/subscriptions` | ✅ | Daftar subscription |
| `POST` | `/api/billing/subscriptions` | ✅ Admin | Buat subscription |

### Server

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/server/stats` | ✅ | Statistik CPU, RAM, network VPS |

### Contoh Request Login

```bash
curl -X POST https://studioserver.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@streamhub.tv","password":"admin123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@streamhub.tv",
    "name": "Admin",
    "role": "admin",
    "createdAt": "2026-03-18T00:00:00.000Z"
  }
}
```

---

## 14. Database Schema

### Tabel `users`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | serial PK | ID otomatis |
| `email` | varchar(255) unique | Email user |
| `password` | varchar(255) nullable | Password hash (null jika Google-only) |
| `name` | varchar(255) | Nama lengkap |
| `role` | varchar(20) | `admin` / `operator` / `user` |
| `google_id` | varchar(255) nullable | Google OAuth ID |
| `avatar_url` | text nullable | URL foto profil dari Google |
| `created_at` | timestamp | Waktu registrasi |

### Tabel `channels`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | serial PK | ID channel |
| `name` | varchar(255) | Nama channel |
| `description` | text nullable | Deskripsi channel |
| `stream_key` | varchar(255) unique | Key streaming unik |
| `is_active` | boolean | Status aktif/non-aktif |
| `created_by_id` | integer FK | User yang membuat channel |
| `created_at` | timestamp | Waktu pembuatan |
| `updated_at` | timestamp | Waktu update terakhir |

### Tabel `subscription_plans`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | serial PK | ID paket |
| `name` | varchar(255) | Nama paket |
| `price` | numeric(10,2) | Harga |
| `description` | text nullable | Deskripsi paket |
| `max_channels` | integer | Batas jumlah channel |
| `is_active` | boolean | Status paket |

### Tabel `subscriptions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | serial PK | ID subscription |
| `user_id` | integer FK | User pelanggan |
| `plan_id` | integer FK | Paket yang dipilih |
| `status` | varchar(20) | `active` / `inactive` / `cancelled` |
| `started_at` | timestamp | Tanggal mulai |
| `ends_at` | timestamp nullable | Tanggal berakhir |

### Tabel `invoices`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | serial PK | ID invoice |
| `user_id` | integer FK | User |
| `plan_id` | integer FK | Paket |
| `amount` | numeric(10,2) | Jumlah tagihan |
| `status` | varchar(20) | `paid` / `unpaid` / `overdue` |
| `due_date` | timestamp | Jatuh tempo |

---

## 15. Akun Default

Setelah seed database berjalan, akun berikut tersedia:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@streamhub.tv` | `admin123` |
| **Operator** | `operator@streamhub.tv` | `operator123` |
| **User** | `user@streamhub.tv` | `user123` |

> **Wajib diganti** setelah deployment produksi! Gunakan fitur edit profil atau update langsung di database.

---

## 16. Troubleshooting

### OBS tidak bisa connect RTMP

**Gejala:** OBS gagal connect, error "Failed to connect to server"

**Solusi:**
1. Pastikan Server URL di OBS: `rtmp://stream.studioserver.space/live`
2. Pastikan Stream Key sudah benar (salin dari dashboard)
3. Cek subdomain `stream.studioserver.space` di Cloudflare: **HARUS DNS-Only** (grey cloud), bukan proxied
4. Cek port 1935 terbuka di VPS:
   ```bash
   # Dari komputer lokal
   nc -zv stream.studioserver.space 1935
   # Atau dari VPS
   ss -tlnp | grep 1935
   ```
5. Cek container SRS berjalan:
   ```bash
   docker ps | grep srs
   docker logs docker-srs-1 --tail=20
   ```

### Website tidak bisa diakses / HTTPS error

```bash
# Cek Nginx berjalan
docker ps | grep nginx
docker logs docker-nginx-1 --tail=30

# Cek sertifikat SSL masih valid
certbot certificates

# Reload Nginx
docker exec docker-nginx-1 nginx -s reload
```

### HLS tidak mau play / Stream offline padahal OBS streaming

```bash
# Cek SRS menerima stream
curl http://127.0.0.1:1985/api/v1/streams/

# Cek file HLS tersedia
ls /var/lib/docker/volumes/docker_srs_data/_data/live/

# Cek Nginx proxy ke SRS
curl https://studioserver.space/live/{stream-key}.m3u8
```

### Backend / API error 500

```bash
# Lihat log backend
docker logs docker-backend-1 --tail=50

# Cek koneksi database
docker exec docker-backend-1 node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('SELECT 1').then(() => console.log('DB OK')).catch(console.error);
"
```

### Container tidak mau jalan / restart loop

```bash
# Lihat status semua container
docker compose ps

# Lihat log container yang bermasalah
docker compose logs backend --tail=50
docker compose logs postgres --tail=50

# Restart semua
docker compose down && docker compose up -d
```

### Google OAuth tidak berfungsi

1. Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` sudah di-set di `.env`
2. Pastikan Authorized Redirect URI di Google Cloud Console:
   ```
   https://studioserver.space/api/auth/google/callback
   ```
3. Pastikan Authorized JavaScript Origins:
   ```
   https://studioserver.space
   ```
4. Rebuild backend setelah update `.env`:
   ```bash
   docker compose build backend && docker compose up -d backend
   ```

### Update file tanpa git push (jika git pull tidak sync)

```bash
# Update file spesifik langsung di VPS via heredoc
cat > /root/streamhub/path/ke/file.ts << 'EOF'
# isi file baru di sini
EOF

# Rebuild service yang berubah
cd /root/streamhub/docker
docker compose build backend   # jika backend berubah
docker compose build frontend  # jika frontend berubah
docker compose up -d
```

---

*Dokumentasi ini dibuat untuk StreamHub versi yang berjalan di `studioserver.space`. Terakhir diperbarui: Maret 2026.*
