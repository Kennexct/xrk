# Master Design Document — Sunflower Youth Team Platform
**Technical Architecture & System Master Plan**

| Field | Detail |
|---|---|
| Versi | 1.0 |
| Turunan dari | PRD.md v1.0 |
| Disusun oleh | CTO & Senior Development Team |
| Status | Draft untuk Review Teknis |

---

## 1. Ringkasan Arsitektur

Prinsip utama: **server aplikasi ringan (thin backend)**, seluruh beban berat (video, audio, file besar) didelegasikan ke layanan object storage/CDN eksternal. Server hanya mengurus autentikasi, metadata, business logic, dan real-time presence.

```
                        ┌────────────────────────┐
                        │        CLIENT           │
                        │  Web App (Responsive)   │
                        │  Desktop / Tablet /      │
                        │  Mobile Browser          │
                        └───────────┬─────────────┘
                                    │ HTTPS
                                    ▼
                        ┌────────────────────────┐
                        │      REVERSE PROXY       │
                        │   (Nginx / Cloudflare)   │
                        └───────────┬─────────────┘
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │                 APPLICATION SERVER                  │
        │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐ │
        │  │ REST/GraphQL│ Auth (JWT)  │ │ WebSocket (Presence│ │
        │  │  API Layer │ │  + RBAC    │ │ / Online Status)  │ │
        │  └───────────┘ └────────────┘ └──────────────────┘ │
        │  ┌────────────────────────────────────────────────┐ │
        │  │  Modules: User, Video(meta), Music(meta),        │ │
        │  │  News, Calendar/Event, Activity Log, Notification│ │
        │  └────────────────────────────────────────────────┘ │
        └───────────┬───────────────────────┬─────────────────┘
                     │                       │
                     ▼                       ▼
        ┌─────────────────────┐   ┌───────────────────────────┐
        │   DATABASE (Primary)  │   │   CACHE / QUEUE            │
        │  PostgreSQL           │   │  Redis (session, presence, │
        │  (users, events,      │   │  job queue for transcoding │
        │   news, metadata, log)│   │  webhook, notifications)   │
        └─────────────────────┘   └───────────────────────────┘

        ┌──────────────────────────────────────────────────────┐
        │              EXTERNAL MEDIA LAYER (Offloaded)          │
        │  ┌──────────────────┐  ┌───────────────────────────┐ │
        │  │ Video Streaming    │  │ Object Storage (S3-compat) │ │
        │  │ Cloudflare Stream  │  │ Cloudflare R2 / AWS S3     │ │
        │  │ (adaptive HLS)     │  │ (musik, gambar, dokumen,   │ │
        │  │                    │  │  folder aktivitas)         │ │
        │  └──────────────────┘  └───────────────────────────┘ │
        └──────────────────────────────────────────────────────┘
```

**Alur upload video (presigned/direct-to-cloud):**
```
Browser ──(1) request upload URL──▶ App Server
Browser ◀──(2) presigned URL───────  App Server
Browser ──(3) upload file langsung──▶ Cloudflare Stream / R2
Cloudflare ──(4) webhook: transcode selesai──▶ App Server
App Server ──(5) simpan metadata (video_id, thumbnail, HLS url)──▶ DB
```
Server aplikasi **tidak pernah menerima byte video** — hanya koordinasi URL & metadata.

## 2. Tech Stack Rekomendasi

| Layer | Pilihan Utama | Alasan |
|---|---|---|
| Frontend | **Next.js (React) + Tailwind CSS** | SSR/SSG untuk performa, responsive utility-first, ekosistem besar |
| State/Data fetching | React Query / SWR | Caching otomatis, mengurangi request berulang |
| Backend | **Node.js (NestJS/Express) atau Laravel (PHP)** | Cepat dikembangkan, banyak talent, cocok skala organisasi |
| Database | **PostgreSQL** | Relasional kuat untuk user/role/event, mature, gratis |
| Cache/Realtime | **Redis + WebSocket (Socket.IO)** | Online presence, notifikasi real-time, job queue |
| Object Storage | **Cloudflare R2** (kompatibel S3, tanpa biaya egress) | Untuk musik, gambar, dokumen folder aktivitas |
| Video Streaming | **Cloudflare Stream** (atau YouTube Unlisted di fase awal) | Adaptive bitrate otomatis, player ringan, minim maintenance |
| Auth | JWT + Refresh Token, opsional OAuth Google | Standar aman, mudah scale |
| Hosting | VPS (mis. DigitalOcean/Contabo) atau Vercel (frontend) + Railway/Render (backend) | Skala 100+ user tidak butuh infra mahal |
| Monitoring | Uptime Kuma / Sentry | Pantau error & downtime tanpa biaya besar |

> Catatan: pemilihan Node.js vs Laravel disesuaikan dengan keahlian tim developer yang tersedia — keduanya cukup untuk skala ini.

## 3. Skema Database (Entitas Utama — Ringkas)

```
users
 ├─ id, name, email, password_hash, nim, division, role_id, avatar_url
 ├─ status (active/inactive), created_at

roles
 ├─ id, name (super_admin, content_admin, event_coordinator, member, guest)

sessions / presence
 ├─ user_id, is_online (bool), last_seen_at, socket_id

activity_logs
 ├─ id, user_id, action_type (login, logout, upload_video, publish_news, edit_event, ...)
 ├─ target_type, target_id, ip_address, user_agent, created_at

videos
 ├─ id, uploader_id, title, description, category, thumbnail_url
 ├─ stream_provider_id (Cloudflare Stream video id), hls_url
 ├─ status (processing/ready), view_count, created_at

musics
 ├─ id, uploader_id, title, artist, division, file_url (R2), duration, play_count, created_at

news
 ├─ id, author_id, title, content, cover_image_url, category
 ├─ status (draft/scheduled/published/archived), publish_at, created_at

events
 ├─ id, creator_id, title, description, location, start_time, end_time
 ├─ status (upcoming/ongoing/done), attachment_urls[]

event_rsvp
 ├─ event_id, user_id, status (going/maybe/not_going)

activity_folders
 ├─ id, event_id, division, name

activity_files
 ├─ id, folder_id, uploader_id, file_url (R2), file_type, size, created_at

notifications
 ├─ id, user_id, type, message, is_read, created_at
```

## 4. Strategi Responsive Design

| Breakpoint | Target Device | Layout Utama |
|---|---|---|
| ≥ 1280px | Desktop | Sidebar navigasi tetap + grid multi-kolom (3–4 kolom galeri) |
| 768–1279px | Tablet | Sidebar collapsible + grid 2 kolom |
| ≤ 767px | Mobile | Bottom navigation bar + single column, video/music player full-width |

Pendekatan: **Mobile-first CSS (Tailwind)**, komponen video/audio player menggunakan lazy-loading agar tidak memberatkan render awal di perangkat low-end.

## 5. Modul Online Status & Activity Log — Detail Teknis

1. **Presence real-time**: koneksi WebSocket saat user login → status `is_online=true` di Redis (key `presence:{user_id}`, TTL 60s, di-refresh via heartbeat tiap 30s dari client).
2. **Last seen**: saat koneksi terputus (disconnect/timeout), sistem mencatat `last_seen_at = now()` ke PostgreSQL.
3. **Activity log**: setiap aksi penting (login, upload, publish, edit, hapus) ditulis ke tabel `activity_logs` secara asynchronous via queue (agar tidak menghambat response utama).
4. **Dashboard Admin**: menampilkan daftar user online saat ini (real-time via WebSocket subscription) + tabel histori log dengan filter tanggal/user/jenis aksi, dapat diekspor ke CSV/Excel.
5. **Retensi data log**: default 90–180 hari aktif, data lebih lama diarsipkan (compressed export) untuk menjaga performa query.

## 6. Keamanan

- HTTPS wajib (TLS via Cloudflare/Let's Encrypt).
- Password: hashing dengan **argon2id**.
- Rate limiting login (mis. 5x gagal → lockout 15 menit) untuk cegah brute force.
- RBAC granular per modul (lihat tabel role di PRD Section 4).
- Presigned URL upload memiliki masa berlaku singkat (mis. 15 menit) dan validasi tipe/ukuran file di sisi server sebelum URL diterbitkan.
- Audit log tidak dapat diedit/dihapus oleh role selain Super Admin (append-only).
- Backup database harian terenkripsi, disimpan terpisah dari server utama.

## 7. Estimasi Kapasitas & Biaya (Gambaran Kasar)

| Komponen | Estimasi Skala 100–300 User | Catatan |
|---|---|---|
| VPS Backend + DB | 2 vCPU / 4GB RAM | Cukup untuk beban metadata/API, karena media di-offload |
| Cloudflare R2 (storage) | ~50–100GB/bulan awal | Biaya jauh lebih rendah dari S3 (tanpa egress fee) |
| Cloudflare Stream | Bayar per menit video disimpan + ditonton | Bisa mulai dari beberapa jam video kegiatan/bulan |
| Redis | Shared kecil (512MB) | Untuk presence & queue |
| CDN/Bandwidth statis | Ditangani Cloudflare (gratis di banyak tier) | Mengurangi beban origin server |

> Estimasi ini indikatif; perlu disesuaikan dengan volume konten aktual setelah 1–2 bulan berjalan.

## 8. Rencana Deployment

1. **Environment**: `development` → `staging` → `production`, dipisah database dan storage bucket.
2. **CI/CD**: GitHub Actions — auto-test & auto-deploy ke staging saat merge ke `develop`, manual approve untuk `main` → production.
3. **Containerization**: Docker Compose untuk backend + Redis + Nginx, memudahkan replikasi environment.
4. **Monitoring pasca-launch**: uptime check tiap 5 menit, alert ke grup WA/Telegram pengurus jika downtime.

## 9. Struktur Folder Proyek (Contoh — Monorepo)

```
sunflower-youth-team/
├── apps/
│   ├── web/                # Next.js frontend
│   └── api/                 # Backend (NestJS/Laravel)
├── packages/
│   ├── ui/                  # Shared UI components
│   └── config/               # Shared config (eslint, tailwind, tsconfig)
├── infra/
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/
│   ├── PRD.md
│   └── master.md
└── README.md
```

## 10. Checklist Kesiapan Sebelum Development Dimulai

- [ ] Pilih penyedia video streaming (Cloudflare Stream vs YouTube Unlisted untuk MVP)
- [ ] Setup akun object storage (Cloudflare R2)
- [ ] Finalisasi daftar role & matriks izin akses
- [ ] Desain UI/UX wireframe (Figma) untuk 3 breakpoint (desktop/tablet/mobile)
- [ ] Setup repository, CI/CD pipeline, environment staging
- [ ] Kebijakan retensi log & privasi data anggota disetujui pengurus

---

*Dokumen ini adalah spesifikasi teknis pendamping `PRD.md`. Perubahan scope pada PRD wajib disinkronkan ke dokumen ini.*
