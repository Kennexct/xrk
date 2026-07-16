# PRD — Sunflower Youth Team Platform
**Product Requirements Document**

| Field | Detail |
|---|---|
| Nama Produk | Sunflower Youth Team Platform (SYT Platform) |
| Jenis Dokumen | Product Requirements Document (PRD) |
| Versi | 1.0 |
| Disusun oleh | CTO & Senior Development Team |
| Status | Draft untuk Review |

---

## 1. Latar Belakang

Sunflower Youth Team adalah himpunan mahasiswa yang bergerak di bidang seni dan budaya, dengan kegiatan rutin berupa produksi konten video, musik, publikasi berita kegiatan, serta koordinasi jadwal antar divisi. Saat ini pengelolaan kegiatan tersebar di berbagai platform (grup chat, cloud storage pribadi, dokumen manual), sehingga sulit dipantau, tidak terpusat, dan minim akuntabilitas terhadap siapa yang aktif mengelola konten.

Dibutuhkan sebuah **platform terpusat berbasis web**, responsif di desktop/tablet/mobile, yang mampu menampung ≥100 pengguna aktif dengan kebutuhan utama: publikasi video, musik, berita, kalender kegiatan, dan pemantauan aktivitas pengguna (online status & log aktivitas).

## 2. Tujuan Produk

1. Menyediakan satu portal resmi organisasi untuk seluruh anggota (≥100 orang).
2. Memusatkan publikasi **video kegiatan**, **musik/karya audio**, dan **berita/update kegiatan**.
3. Menyediakan **kalender & timeline kegiatan** organisasi yang dapat diakses seluruh anggota.
4. Memberikan visibilitas **status online, last seen, dan log aktivitas** setiap pengguna untuk kebutuhan akuntabilitas kepengurusan.
5. Memastikan **beban server tetap ringan**, khususnya pada fitur upload & playback video, karena traffic media adalah komponen paling berat dalam sistem ini.

## 3. Target Pengguna & Skala

- **Skala awal:** 100–300 pengguna terdaftar, dengan asumsi 20–40 pengguna aktif bersamaan (concurrent) pada jam sibuk (rapat, publikasi konten baru).
- **Skala pertumbuhan (12 bulan):** hingga 500 pengguna, mempertimbangkan alumni dan kolaborasi antar-himpunan.
- Perangkat dominan: **mobile (Android/iOS via browser)** untuk anggota, **desktop** untuk tim pengurus/admin konten.

## 4. Role & Persona Pengguna

| Role | Deskripsi | Hak Akses Utama |
|---|---|---|
| **Super Admin** | Ketua/Wakil/CTO organisasi | Full access: kelola user, role, konten, laporan aktivitas, pengaturan sistem |
| **Content Admin (Divisi Media)** | PIC upload video/musik/berita | CRUD konten media & berita, moderasi upload |
| **Event Coordinator** | PIC kalender & kegiatan | CRUD event/timeline, notifikasi kegiatan |
| **Member (Anggota)** | Anggota aktif himpunan | Lihat konten, komentar/like, RSVP event, upload ke folder aktivitas divisinya (jika diizinkan) |
| **Guest/Alumni (opsional)** | Akses terbatas, publik/undangan | Lihat konten publik saja (read-only), tanpa upload |

## 5. Ruang Lingkup Fitur (Scope)

### 5.1 Modul Wajib (MVP)

1. **Autentikasi & Manajemen Pengguna**
   - Registrasi via undangan/approval admin (bukan open registration, untuk menjaga kualitas 100+ user internal).
   - Login (email/username + password), opsional SSO Google.
   - Profil anggota: nama, NIM, divisi, foto, kontak.
   - Role-based access control (RBAC).

2. **Modul Video Kegiatan**
   - Upload video oleh Content Admin/Member (sesuai izin).
   - **Tidak menyimpan file video mentah di server aplikasi** — lihat Section 8 (Strategi Video).
   - Playback ringan (adaptive streaming), thumbnail otomatis, view counter, share link.
   - Kategori: Dokumentasi Acara, Behind The Scene, Karya Anggota, dsb.

3. **Modul Musik**
   - Upload karya audio (mp3/wav → dikonversi ke format streaming ringan, misal AAC/Opus).
   - Player streaming dengan playlist per album/kegiatan.
   - Metadata: judul, pencipta/performer, divisi, tanggal rilis.

4. **Modul Berita & Update Kegiatan**
   - CMS sederhana: buat, edit, publish, arsip berita.
   - Kategori: Pengumuman, Kegiatan Terkini, Kegiatan Mendatang.
   - Rich text + gambar cover, tag, dan penjadwalan publish (scheduled post).

5. **Kalender & Timeline Kegiatan**
   - Tampilan bulanan/mingguan (calendar view) dan timeline linier (list kronologis).
   - Event detail: judul, deskripsi, lokasi, PIC, lampiran, status (Upcoming/Ongoing/Selesai).
   - RSVP/konfirmasi kehadiran anggota (opsional).
   - Sinkronisasi ke Google Calendar (export .ics) — nice-to-have MVP+1.

6. **Folder Aktivitas (Activity Folder Upload)**
   - Struktur folder per kegiatan/divisi untuk upload dokumentasi (foto, dokumen, draft).
   - Bukan untuk video besar (diarahkan ke Modul Video), tapi untuk file pendukung (PDF, gambar, doc) dengan limit ukuran wajar (mis. 25MB/file).
   - Struktur: `Kegiatan/[Nama Event]/[Divisi]/[File]`.

7. **Online Status & Activity Log**
   - Indikator online/offline real-time (dot hijau/abu).
   - "Last seen" timestamp per user.
   - Log aktivitas: login/logout, upload konten, edit, publish, dengan timestamp & IP (untuk audit).
   - Dashboard admin: daftar user aktif saat ini, riwayat aktivitas per user, filter tanggal.

8. **Notifikasi**
   - In-app notification (bell icon): konten baru, event baru, mention.
   - Opsional: email digest mingguan.

### 5.2 Modul Lanjutan (Post-MVP / Phase 2)

- Komentar & reaksi (like/love) pada video, musik, berita.
- Pencarian global (search konten, anggota, event).
- Dashboard statistik (views, engagement per divisi).
- Progressive Web App (installable, push notification).
- Multi-bahasa (ID/EN).
- Integrasi WhatsApp/Telegram bot untuk notifikasi kegiatan.

### 5.3 Di Luar Scope (Out of Scope)

- Transaksi keuangan/pembayaran.
- Live streaming real-time (hanya video on-demand di fase ini).
- Aplikasi native mobile (cukup responsive web/PWA).

## 6. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| **Responsiveness** | Fully responsive: Desktop (≥1280px), Tablet (768–1024px), Mobile (≤767px) |
| **Performa** | First load < 2.5s (4G), video mulai diputar < 2s (adaptive bitrate) |
| **Ketersediaan (Uptime)** | ≥ 99% (skala organisasi, bukan enterprise-critical) |
| **Kapasitas** | Mendukung ≥100 user terdaftar, 30–50 concurrent, skalabel ke 500 user |
| **Keamanan** | HTTPS wajib, password hashing (bcrypt/argon2), rate limiting login, RBAC, audit log |
| **Beban Server** | Server aplikasi TIDAK menyimpan/streaming file video besar langsung — delegasi ke layanan media eksternal (lihat Section 8) |
| **Backup** | Backup database harian otomatis, retensi 30 hari |
| **Aksesibilitas** | Kontras warna memadai, navigasi keyboard dasar, alt-text gambar |

## 7. Alur Pengguna Utama (User Flow Singkat)

1. **Member baru** → menerima undangan admin → set password → lengkapi profil → landing dashboard (feed kegiatan terbaru).
2. **Content Admin** → login → upload video → sistem generate link streaming eksternal → video tampil di galeri dengan thumbnail otomatis.
3. **Event Coordinator** → buat event baru di kalender → notifikasi terkirim ke seluruh anggota → anggota RSVP.
4. **Super Admin** → buka dashboard aktivitas → melihat siapa online, last seen, dan histori aksi tiap user dalam rentang tanggal tertentu.

## 8. Strategi Kunci: Upload & Playback Video Ringan (Tanpa Membebani Server)

Ini adalah requirement kritikal. Pendekatan yang direkomendasikan:

1. **Direct-to-Cloud Upload (Presigned URL)**
   File video **tidak pernah transit melalui server aplikasi**. Client (browser) melakukan upload langsung ke object storage/CDN video menggunakan presigned URL yang di-generate oleh backend. Server hanya menyimpan metadata (judul, URL, durasi, thumbnail).

2. **Pilihan Layanan Video Backend** (dipilih salah satu sesuai budget):
   - **Cloudflare Stream** — auto adaptive bitrate (HLS/DASH), player ringan bawaan, biaya per menit video tersimpan+ditonton. Paling direkomendasikan untuk skala 100+ user karena murah dan minim maintenance.
   - **Bunny.net Stream** — alternatif lebih murah, auto-transcode, global CDN.
   - **YouTube Unlisted/Private (embed)** — opsi paling hemat biaya (gratis) untuk fase awal/MVP; kekurangan: kontrol branding & analitik terbatas.
   - *(Self-hosted seperti MinIO+FFmpeg hanya disarankan jika ada tim infra khusus, karena menambah beban operasional.)*

3. **Adaptive Bitrate Streaming (HLS)**
   Video otomatis di-transcode ke beberapa resolusi (360p/480p/720p) sehingga player memilih kualitas sesuai kecepatan jaringan penonton → hemat bandwidth & tetap smooth di mobile.

4. **Thumbnail & Preview Otomatis**
   Digenerate otomatis oleh layanan video (bukan diproses di server aplikasi).

5. **Lazy Loading & Player Ringan**
   Galeri video menggunakan lazy-load (video baru dimuat saat player diklik/masuk viewport), menggunakan library player ringan (hls.js / plyr / video.js) — bukan embed berat.

6. **Tracking Jangka Panjang**
   View count, watch duration, dan retensi ditangani via webhook/analytics API dari layanan video (Cloudflare Stream Analytics / YouTube Data API), lalu disimpan ringkas di database aplikasi untuk laporan internal.

7. **Musik (Audio)**
   Sama prinsipnya: upload langsung ke object storage (S3-compatible), diputar via streaming progresif (bukan full-download), format terkompresi (AAC/Opus) untuk hemat bandwidth.

8. **Folder Aktivitas (non-video)**
   File dokumen/gambar disimpan di object storage (S3-compatible: AWS S3 / Cloudflare R2 / Wasabi) dengan limit ukuran, bukan di server aplikasi — server hanya menyimpan referensi path.

> **Kesimpulan strategi:** Server aplikasi berperan sebagai *orchestrator* (metadata, auth, permission), bukan tempat penyimpanan/streaming file berat. Ini menjaga server tetap ringan meski jumlah video & user bertambah.

## 9. Metrik Keberhasilan (Success Metrics)

- ≥ 80% anggota (dari 100+ target) aktif login minimal 1x/bulan dalam 3 bulan pertama.
- Waktu upload video oleh admin < 5 menit (proses hingga siap ditonton, termasuk transcoding).
- Zero downtime tercatat akibat beban upload video (karena didelegasikan ke layanan eksternal).
- Log aktivitas dapat ditelusuri minimal 90 hari ke belakang.

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Biaya layanan video eksternal membengkak seiring pertumbuhan | Mulai dengan tier gratis/murah (YouTube unlisted / Cloudflare Stream free tier), monitor penggunaan bulanan |
| Anggota upload konten tidak pantas | Moderasi berlapis: hanya Content Admin & role tertentu yang bisa publish, approval workflow untuk member |
| Adopsi rendah karena UX rumit | Desain mobile-first, onboarding sederhana, undangan langsung ke WA/email |
| Kebocoran data log aktivitas (privasi) | Log aktivitas hanya bisa diakses Super Admin, kebijakan retensi & anonimisasi data lama |

## 11. Roadmap Fase Pengembangan

| Fase | Durasi Estimasi | Output |
|---|---|---|
| Fase 1 — MVP | 6–8 minggu | Auth, Video, Musik, Berita, Kalender, Activity Log dasar |
| Fase 2 — Enhancement | 3–4 minggu | Komentar, notifikasi, search, statistik dashboard |
| Fase 3 — Optimasi | 2–3 minggu | PWA, caching, performance tuning, laporan otomatis |

---

*Dokumen ini adalah dasar untuk `master.md` (spesifikasi teknis & arsitektur sistem).*
