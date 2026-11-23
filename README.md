<p align="center">
  <img src="public/logo.png" alt="Karaoke TV — Nyanyi Bersama, Dimana Saja!" width="420" />
</p>

<h1 align="center">Karaoke TV — TV &amp; HP</h1>

<p align="center">
  Aplikasi karaoke streaming dua perangkat: TV jadi pemutar video, HP siapa pun jadi operator playlist.
</p>

<p align="center">
  <a href="https://ado-karaoke-tv.vercel.app/"><strong>🔴 Buka aplikasi live: ado-karaoke-tv.vercel.app</strong></a>
</p>

<p align="center">
  Next.js 15 · TypeScript · Supabase · YouTube Data API · Vercel
</p>

---

## Daftar isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Cara pakai](#cara-pakai)
- [Teknologi](#teknologi)
- [Struktur repo](#struktur-repo)
- [Setup lokal](#setup-lokal)
- [Environment variable](#environment-variable)
- [Setup Supabase](#setup-supabase)
- [Deploy](#deploy)
- [Catatan teknis](#catatan-teknis)
- [Batasan yang diketahui](#batasan-yang-diketahui)
- [Dokumentasi](#dokumentasi)

## Tentang

Karaoke TV menyelesaikan satu masalah sederhana: di acara kumpul, semua orang berebut laptop atau
HP untuk memilih lagu, padahal lagunya harus diputar di TV. Aplikasi ini memisahkan dua peran itu.

- **TV** membuka room, menampilkan QR code, dan memutar video karaoke dari YouTube.
- **HP siapa pun** (jumlahnya bebas) memindai QR, mencari lagu, menyusun antrian, dan mengendalikan
  pemutaran dari jauh.

Tidak ada login, tidak ada instalasi aplikasi di HP. Kode room 5 karakter (atau QR) berfungsi sebagai
"kata sandi" room, cocok untuk karaoke rumahan, acara kantor, atau arisan.

**Aplikasi live:** <https://ado-karaoke-tv.vercel.app/>

## Fitur

### Layar TV (host)

- Membuat room baru dalam satu klik, langsung menampilkan QR code + kode 5 karakter.
- Memutar video karaoke YouTube berurutan sesuai antrian, otomatis memutar lagu pertama.
- Sinkronisasi waktu putar dengan HP: play/pause/seek/skip dari HP langsung terasa di TV, dengan
  koreksi drift otomatis tiap 5 detik.
- Panel QR + playlist ringkas dalam satu layar penuh tanpa scroll (720p sampai 1080p).
- Tombol **Layar penuh** (fullscreen browser) dan **Akhiri room** (satu klik, tanpa dialog).
- Layar "Room sudah diakhiri" dengan tombol membuat room baru.

### Layar HP (operator)

- Masuk lewat QR (kamera) atau kode manual, lalu isi nama lewat popup saat pertama masuk.
- Pencarian lagu karaoke otomatis saat mengetik, hasil sudah difilter ke versi karaoke dan diberi
  badge `karaoke`.
- Tambah lagu dari hasil pencarian atau dari **link YouTube**.
- Antrian realtime: lihat, naikkan/turunkan urutan, dan hapus lagu.
- Kontrol penuh: play/pause, mundur/maju 10 detik, skip.
- Daftar anggota room dengan status **online/offline** (berbasis heartbeat presence).
- Sakelar **Tampilan TV**: mode gelap dan layar penuh video, dikendalikan dari HP dengan animasi
  halus.
- **Keluar room** (hanya menutup HP itu) dan **Akhiri room** (menghapus sesi untuk semua orang,
  dengan konfirmasi).

### Pengalaman bersama

- Deteksi perangkat di halaman utama: kalau dibuka di TV atau laptop, muncul popup
  "Langsung buat room?" dengan tombol ⚡ Buat Room.
- Desain cerah dan hangat (bukan neon), menyesuaikan layar TV maupun HP.
- Semua tombol punya animasi tekan (pop + ripple), efek suara, dan getaran di Android.
- Jingle latar lembut hanya berbunyi di luar room — otomatis mati saat masuk room.
- Mode demo lokal: aplikasi tetap bisa dicoba tanpa Supabase (TV + HP di dua tab browser yang sama).

## Cara pakai

1. Buka <https://ado-karaoke-tv.vercel.app/> di perangkat yang tersambung ke TV (laptop, Android TV,
   mini PC) lalu tekan **Buat Room di TV**.
2. Di TV akan muncul QR code dan kode 5 karakter. Biarkan halaman itu terbuka.
3. Semua orang memindai QR dengan kamera HP (atau membuka `domain/r/KODE`), mengisi nama, lalu
   mencari lagu.
4. Tekan **+ Antrian** pada lagu pilihan. TV langsung memutarnya bila antrian masih kosong.
5. Atur dari HP: pause, maju/mundur 10 detik, skip, ubah urutan, atau nyalakan mode gelap / layar
   penuh video.
6. Setelah selesai, tekan **Akhiri room** di TV (atau dari HP). Semua HP otomatis keluar.

> TV butuh satu klik pertama ("Aktifkan suara") karena kebijakan autoplay browser. Kalau layar TV
> memakai remote, arahkan kursor ke tombol itu lalu tekan OK.

## Teknologi

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 | Routing file-based, server routes untuk API key rahasia |
| Bahasa | TypeScript (strict) | Kontrak data room/antrian jelas |
| Styling | CSS biasa di `app/globals.css` | Tanpa dependency tambahan, kontrol penuh layout satu layar |
| Database & realtime | Supabase (Postgres + Realtime) | Realtime channel + presence tanpa server sendiri |
| Penyimpanan fallback | localStorage + BroadcastChannel | Mode demo tanpa akun Supabase |
| Pencarian video | YouTube Data API v3 | Hasil relevan + durasi video |
| QR | `qrcode` (server, SVG) + `jsqr` (kamera) | QR ringan, pemindaian di browser |
| Audio | Web Audio API | Efek suara & jingle tanpa file audio |
| Hosting | Vercel | Deploy otomatis dari GitHub |

## Struktur repo

```
app/
  layout.tsx              root layout, metadata, SoundLayer global
  page.tsx                beranda: buat room / gabung / deteksi perangkat
  globals.css             seluruh styling (tema terang & gelap, TV & HP)
  host/page.tsx           membuat room lalu redirect ke /host/[code]
  host/[code]/page.tsx    layar TV: QR, pemutar YouTube, playlist
  r/[code]/page.tsx       layar HP: nama, pencarian, antrian, kontrol, anggota
  api/qr/route.ts         generator QR (SVG)
  api/youtube/search      pencarian + filter/ranking karaoke
  api/youtube/video       baca judul, channel, durasi dari link YouTube
  api/status/route.ts     diagnostik env (Supabase & YouTube)
components/
  HostRoom.tsx            logika layar TV
  ControllerRoom.tsx      logika layar HP
  QrScanner.tsx           modal pemindai QR (kamera)
  SoundLayer.tsx          efek suara, getaran, jingle, dock audio
lib/
  types.ts                tipe Room, QueueItem, Snapshot, RoomMember
  playback.ts             perhitungan posisi lagu (started_at + position_ms)
  audio.ts                mesin audio Web Audio (SFX, jingle, preferensi)
  store/
    index.ts              memilih Supabase atau demo berdasarkan env
    core.ts               implementasi operasi room/antrian (Store)
    backend.ts            kontrak Backend + factory room kosong
    supabase.ts           backend Supabase + realtime + presence
    demo.ts               backend localStorage + BroadcastChannel + presence lokal
supabase/schema.sql       skema tabel, RLS publik, publikasi realtime
public/                   logo.png, icon.png
```

## Setup lokal

```bash
npm install
cp .env.example .env.local   # isi tiga variabel (lihat di bawah)
npm run dev                  # http://localhost:3000
```

Perintah lain:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # build produksi
npm run start       # jalankan hasil build
```

Tanpa Supabase, aplikasi otomatis masuk **mode demo**: room disimpan di `localStorage` dan
disinkronkan lewat `BroadcastChannel`, jadi TV dan HP harus dua tab di browser yang sama. Cocok untuk
mencoba alur tanpa membuat akun.

## Environment variable

| Nama | Wajib | Fungsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | untuk mode nyata | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | untuk mode nyata | anon key Supabase (aman untuk browser, RLS terbuka) |
| `YOUTUBE_API_KEY` | opsional | Pencarian YouTube; tanpa ini masih bisa tambah lagu lewat link |

`.env.local` **menimpa** `.env`. Isi di satu tempat saja, jangan biarkan nilai kosong menutupi nilai
asli. Setelah mengubah env, restart `npm run dev` atau redeploy di Vercel.

Cek hasilnya di `GET /api/status` — menampilkan status key YouTube (tanpa membocorkan nilainya),
apakah Supabase terbaca, dan mode store yang aktif.

## Setup Supabase

1. Buat project gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, lalu **Run**.
3. Ambil **Project URL** dan **anon public key** di **Project Settings → API**, isi ke env.

`schema.sql` bersifat idempotent (`create table if not exists`, `drop policy if exists`), jadi aman
dijalankan ulang. Untuk database yang dibuat sebelum fitur mode gelap & layar penuh, jalankan dua
baris migrasi berikut (juga sudah ada di dalam file):

```sql
alter table public.rooms add column if not exists dark boolean not null default false;
alter table public.rooms add column if not exists stage boolean not null default false;
```

> Catatan keamanan: tabel dibuka untuk `anon` karena tamu tidak login. Kode room berfungsi sebagai
> "kata sandi". Ini cocok untuk karaoke rumahan, bukan untuk menyimpan data sensitif.

## Deploy

### Vercel (dipakai aplikasi live)

1. Upload repo ini ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new), import repo, framework terdeteksi **Next.js**.
3. Tambahkan tiga environment variable di **Settings → Environment Variables**.
4. **Deploy**, lalu buka domainnya. Setelah mengubah env, lakukan **Redeploy** (env baru tidak
   berlaku pada deployment lama).

Aplikasi contoh: <https://ado-karaoke-tv.vercel.app/>

### Netlify

Import repo di [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing
project**. Framework terdeteksi Next.js otomatis (`@netlify/plugin-nextjs`). Tambahkan environment
variable yang sama di **Site configuration → Environment variables**.

Panduan langkah demi langkah (dengan gambar alur) ada di [DEPLOY.md](DEPLOY.md).

## Catatan teknis

- **Sinkronisasi putar** memakai acuan `rooms.started_at` + `rooms.position_ms`. Posisi dihitung
  sebagai selisih waktu sejak `started_at`, jadi semua perangkat bisa menghitung sendiri tanpa
  polling cepat. TV mengoreksi drift tiap 5 detik bila selisih lebih dari 2,5 detik.
- **Kehadiran anggota** memakai Supabase Realtime Presence (tanpa tabel tambahan). Anggota dianggap
  offline setelah ±20 detik tanpa heartbeat dan dihapus dari daftar setelah 10 menit.
- **Tampilan TV** (gelap / layar penuh) disimpan di kolom `rooms.dark` dan `rooms.stage`, sehingga
  semua HP melihat sakelar yang sama dan TV mengikuti secara realtime.
- **Audio** disintesis di browser (Web Audio), tidak ada file audio. Semua tombol bisa diberi efek
  khusus lewat atribut `data-sound="tap|add|success|skip|toggle|join|error"`.
- **Deteksi perangkat** memakai lebar layar, `maxTouchPoints`, kemampuan hover/pointer, dan
  user-agent TV. Ini heuristik: laptop yang disambung ke TV tetap terdeteksi sebagai laptop.

## Batasan yang diketahui

- Beberapa video karaoke memblokir embed, sehingga tidak bisa diputar di TV. Pilih hasil lain.
- Kamera pemindai QR butuh HTTPS (otomatis di Vercel/Netlify) atau `localhost`.
- Getaran memakai `navigator.vibrate`: jalan di Android/Chrome, belum didukung iOS Safari.
- Kuota YouTube Data API gratis 10.000 unit/hari — cukup untuk ratusan pencarian.
- Mode demo hanya menyinkronkan tab dalam satu browser (bukan antar perangkat).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [01 PRODUCT-REQUIREMENTS.md](01%20PRODUCT-REQUIREMENTS.md) | Tujuan produk, fitur, kebutuhan pengguna, kebutuhan fungsional |
| [02 DESIGN-SYSTEM.md](02%20DESIGN-SYSTEM.md) | Warna, tipografi, komponen UI, aturan desain |
| [03 ARCHITECTURE.md](03%20ARCHITECTURE.md) | Struktur aplikasi, teknologi, dan hubungan antar komponen |
| [04 AI-AGENTS.md](04%20AI-AGENTS.md) | Panduan untuk AI coding agent: standar kode & aturan pengembangan |
| [DEPLOY.md](DEPLOY.md) | Panduan deploy langkah demi langkah |

---

Dibuat untuk karaoke rumahan: satu TV, banyak HP, satu antrian.
