# 🌻 Sunflower Youth Team Platform

Portal terpusat untuk himpunan mahasiswa Sunflower Youth Team: publikasi **video kegiatan**, **musik/karya audio**, **berita**, **kalender & timeline kegiatan**, **folder aktivitas**, serta **online status & activity log** untuk akuntabilitas kepengurusan.

Implementasi dari [`docs/PRD.md`](docs/PRD.md) dan [`docs/master.md`](docs/master.md).

## Arsitektur

**Thin backend** (master.md §1): server aplikasi hanya mengurus autentikasi, metadata, business logic, dan presence real-time. Seluruh beban berat di-offload:

- **Video** → Cloudflare Stream (direct creator upload, adaptive HLS, thumbnail otomatis) — byte video **tidak pernah transit** melalui server aplikasi. Alternatif hemat biaya: embed YouTube unlisted.
- **Audio, gambar, dokumen** → Cloudflare R2 / S3-compatible via **presigned URL** (berlaku 15 menit, tipe & ukuran divalidasi server sebelum URL diterbitkan).
- **Presence** → Socket.IO + Redis (key TTL 60 detik, heartbeat 30 detik, `last_seen` dipersist ke PostgreSQL saat disconnect).

```
apps/
├── web/   # Next.js 14 + Tailwind (responsive: sidebar ≥1280px, drawer tablet, bottom-nav mobile)
└── api/   # Express + Prisma (PostgreSQL) + Socket.IO + Redis
infra/     # docker-compose, nginx, Dockerfiles
docs/      # PRD.md + master.md
```

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, TanStack Query, hls.js (lazy), socket.io-client |
| Backend | Node.js 22, Express, Prisma, Zod, Socket.IO |
| Database | PostgreSQL 16 |
| Cache/Presence | Redis 7 (fallback in-memory untuk dev single-instance) |
| Auth | JWT access (15 mnt) + refresh token rotasi (7 hari, disimpan sebagai hash), **argon2id**, lockout 5x gagal/15 menit |
| Media | Cloudflare Stream + R2 (driver `mock` untuk dev lokal tanpa akun cloud) |

## Menjalankan secara lokal

Prasyarat: Node.js ≥20, PostgreSQL (atau Docker).

```bash
npm install

# 1) Database (paling mudah via Docker)
docker compose -f infra/docker-compose.yml up -d postgres redis

# 2) Konfigurasi API
cp apps/api/.env.example apps/api/.env   # default sudah cocok dengan compose di atas

# 3) Skema + seed Super Admin pertama
npm run db:push -w @syt/api      # atau: npx prisma migrate dev (di apps/api)
npm run db:seed -w @syt/api      # admin@syt.local / ChangeMe123!

# 4) Jalankan keduanya (terminal terpisah)
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

Login dengan `admin@syt.local` / `ChangeMe123!` (ganti segera), lalu undang anggota dari **Admin → Kelola Anggota** — registrasi hanya via undangan (PRD §5.1.1). Tautan undangan disalin dan dibagikan via WA/email.

> **Mode dev tanpa cloud:** `STORAGE_DRIVER=mock` dan `VIDEO_DRIVER=mock` (default) mensimulasikan presigned upload secara lokal dan memakai sample HLS stream, sehingga seluruh alur upload/playback bisa dicoba tanpa akun Cloudflare. Di production, set driver `r2`/`cloudflare` beserta kredensialnya.

## Full stack via Docker

```bash
cd infra
JWT_ACCESS_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32) docker compose up --build
# nginx di :80 → web (:3000) + api (:4000, path /api & /socket.io)
```

## Konfigurasi production (Cloudflare)

1. **R2**: buat bucket + API token → isi `S3_*` env, `STORAGE_DRIVER=r2`, dan `S3_PUBLIC_BASE_URL` (custom domain bucket).
2. **Stream**: isi `CF_ACCOUNT_ID` + `CF_STREAM_API_TOKEN`, `VIDEO_DRIVER=cloudflare`, lalu daftarkan webhook ke `https://<api>/api/webhooks/cloudflare-stream` dan simpan secret-nya di `CF_STREAM_WEBHOOK_SECRET`.
3. **Wajib** set `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` acak dan `WEB_ORIGIN`/`PUBLIC_API_URL` sesuai domain (HTTPS).

## API singkat

Semua endpoint berprefix `/api`, autentikasi `Authorization: Bearer <access token>`.

| Area | Endpoint utama |
|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/accept-invitation`, `GET /auth/me` |
| Users | `GET /users` (direktori + presence), `PATCH /users/me`, `POST/GET/DELETE /users/invitations`, `PATCH /users/:id` |
| Video | `GET /videos`, `POST /videos/upload-url` (direct-to-cloud), `POST /videos/youtube`, `POST /videos/:id/view`, webhook `POST /webhooks/cloudflare-stream` |
| Musik | `GET /music`, `POST /music/upload-url` (presigned R2), `POST /music`, `POST /music/:id/play` |
| Berita | `GET/POST /news`, `GET /news/:idOrSlug`, `PATCH/DELETE /news/:id` (draft/scheduled/published/archived) |
| Event | `GET/POST /events`, `PATCH/DELETE /events/:id`, `POST /events/:id/rsvp`, `GET /events/:id/ics` |
| Folder | `GET/POST /folders`, `POST /folders/:id/upload-url`, `POST /folders/:id/files` (≤25MB) |
| Aktivitas | `GET /activity/logs` (filter + `?format=csv`), `GET /activity/online`, `GET /activity/summary` — Super Admin |
| Notifikasi | `GET /notifications`, `POST /notifications/read-all`, `POST /notifications/:id/read` |

## RBAC (PRD §4)

Matriks izin tunggal di `apps/api/src/lib/rbac.ts` (diuji unit): Super Admin penuh; Content Admin kelola video/musik/berita; Event Coordinator kelola kalender; Member melihat, RSVP, upload karya & file; Guest read-only.

## Testing & CI

```bash
npm run typecheck   # kedua workspace
npm test            # vitest (RBAC, validasi presign, parser YouTube)
npm run build
```

GitHub Actions (`.github/workflows/ci.yml`) menjalankan typecheck, test, dan build pada setiap push/PR.

## Catatan keputusan teknis

- **Express dipilih** dari opsi "NestJS/Express" master.md §2 — modul router per domain tetap terstruktur, dependensi minim untuk skala 100–500 user.
- **Role sebagai enum Prisma** (bukan tabel terpisah) karena daftar role bersifat tetap di PRD §4; mengurangi join tanpa mengurangi kemampuan RBAC.
- **Status event diturunkan dari waktu** (upcoming/ongoing/done) saat dibaca sehingga tidak pernah basi.
- **Activity log fire-and-forget** — penulisan audit tidak pernah memblokir response (master.md §5.3); append-only, hanya Super Admin yang bisa membaca.
- Fase 2 (komentar/reaksi, pencarian global, PWA/push, statistik) belum termasuk — lihat PRD §5.2.
