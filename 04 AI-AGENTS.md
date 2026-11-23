# 04 — AI Agents Guide

Panduan kerja untuk AI coding agent (dan manusia) yang mengubah repo ini. Baca dokumen ini sebelum
menulis kode. Untuk konteks produk lihat `01 PRODUCT-REQUIREMENTS.md`, untuk visual lihat
`02 DESIGN-SYSTEM.md`, untuk alur data lihat `03 ARCHITECTURE.md`.

---

## 1. Ringkasan proyek

- **Apa ini:** aplikasi karaoke dua perangkat — TV memutar video YouTube, HP mengatur antrian.
- **Stack:** Next.js 15 App Router, React 19, TypeScript strict, CSS biasa (tanpa Tailwind),
  Supabase (Postgres + Realtime + Presence), YouTube Data API v3.
- **Bahasa UI:** Bahasa Indonesia, santai tapi jelas. Semua teks yang dilihat pengguna berbahasa
  Indonesia.
- **Sumber kebenaran gaya:** `app/globals.css` dan `02 DESIGN-SYSTEM.md`.
- **Sumber kebenaran data:** `lib/types.ts`, `lib/store/*`, `supabase/schema.sql`.

## 2. Perintah

```bash
npm install        # pasang dependensi (package-lock.json dipakai apa adanya)
npm run dev        # dev server di :3000
npm run typecheck  # tsc --noEmit — wajib lolos
npm run build      # build produksi — wajib lolos sebelum menyerahkan hasil
```

Catatan lingkungan:

- Jangan menjalankan `next build` saat dev server masih hidup tanpa menghapus `.next` sesudahnya —
  dev server akan error 500 sampai di-restart.
- Proyek ini tidak memakai ESLint aktif saat build (`eslint.ignoreDuringBuilds`), jadi **typecheck
  adalah gerbang utama**.

## 3. Peta file dan tanggung jawab

| File | Tanggung jawab | Boleh diubah untuk |
|---|---|---|
| `app/page.tsx` | Beranda: join, buat room, deteksi perangkat | Perubahan alur masuk/beranda |
| `app/host/page.tsx` | Membuat room + redirect | Perubahan cara room dibuat |
| `app/host/[code]/page.tsx` | Pembungkus layar TV | Perubahan props/route |
| `components/HostRoom.tsx` | Seluruh logika TV (pemutar, QR, playlist, stage, tema) | Fitur layar TV |
| `components/ControllerRoom.tsx` | Seluruh logika HP (nama, cari, antrian, kontrol, anggota) | Fitur layar HP |
| `components/QrScanner.tsx` | Modal kamera + `jsqr` | Perbaikan pemindai |
| `components/SoundLayer.tsx` | SFX global, jingle, animasi tekan, dock audio | Perubahan audio/feedback |
| `lib/store/core.ts` | Logika domain (tambah lagu, next, view) | Aturan bisnis |
| `lib/store/backend.ts` | Kontrak backend + helper room/kode | Menambah operasi data |
| `lib/store/supabase.ts` | Backend produksi + realtime + presence | Query/realtime |
| `lib/store/demo.ts` | Backend demo (localStorage/BroadcastChannel) | Paritas mode demo |
| `lib/audio.ts` | Mesin audio Web Audio | Nada, timing, preferensi |
| `lib/playback.ts` | Perhitungan posisi lagu | Perubahan rumus sinkronisasi |
| `app/globals.css` | Semua styling | Semua perubahan visual |
| `supabase/schema.sql` | Skema + RLS + realtime | Migrasi database |

## 4. Standar kode

### TypeScript

- `strict: true`. Jangan memakai `any` kecuali untuk API eksternal yang tidak bertipe; beri komentar.
- Tipe domain tinggal di `lib/types.ts`. Jangan mendefinisikan ulang bentuk `Room`/`QueueItem` di
  komponen.
- Ekspor fungsi bernama untuk helper; `export default` hanya untuk komponen halaman.
- Gunakan optional chaining dan fallback eksplisit (`room?.dark ?? false`) — data bisa datang dari
  database lama yang belum punya kolom baru.

### React / Next.js

- Semua halaman interaktif adalah komponen client (`'use client'`); jangan menambahkan server
  component untuk state room.
- Efek yang berlangganan store **wajib** mengembalikan fungsi cleanup (`stop()`, `clearInterval`,
  `removeChannel`, `untrack`).
- Hindari menaruh objek store di dependency array tanpa stabilisasi: pakai
  `const store = useMemo(() => getStore(), [])` seperti komponen yang ada.
- Jangan memakai `window`/`document` di level modul komponen — hanya di dalam `useEffect` atau event
  handler.

### CSS

- **Jangan menambahkan Tailwind atau CSS-in-JS.** Semua gaya di `app/globals.css`.
- Pakai variabel (`var(--pink)`, `var(--ink)`, `var(--line)`) — jangan hardcode warna baru.
- Tambahkan blok baru dengan komentar seksi (`/* ---------- Nama ---------- */`) di akhir file.
- Untuk mode gelap, tambahkan override ber-prefix `html.room-dark ...`; jangan membuat tema kedua
  yang terpisah.
- Jaga aturan TV satu layar: `height: 100dvh`, `min-height: 0` pada anak flex/grid, `overflow: hidden`
  di shell. Uji 1280×720 dan 1920×1080.
- Animasi pakai `transform`/`opacity`; hormati `@media (prefers-reduced-motion: reduce)`.

### Bahasa & teks UI

- Bahasa Indonesia, sapaan "kamu", hindari istilah teknis di antarmuka.
- Tombol berupa kata kerja: "Buat Room di TV", "Gabung", "Akhiri room", "Keluar room".
- Pesan error menjelaskan langkah berikutnya, bukan hanya sebab.

## 5. Aturan data (paling penting)

1. **Jangan pernah memanggil Supabase langsung dari komponen.** Semua lewat `getStore()` → `Store`.
   Kalau butuh operasi baru: tambahkan di `Backend`, implementasikan di `core.ts`, lalu di kedua
   backend (`supabase.ts`, `demo.ts`).
2. **Jaga paritas mode demo.** Fitur baru harus tetap berfungsi tanpa env Supabase (localStorage +
   BroadcastChannel), walau hanya untuk satu browser.
3. **Semua perubahan room memakai `updated_at` baru** agar polling/realtime dan pembersihan bekerja.
4. **Jangan mengubah `sort_order` menjadi 1-based rapat.** Sistem memakai kelipatan 100 agar
   penyisipan/reorder tidak menulis ulang seluruh antrian.
5. **Hapus lagu aktif harus memindahkan pemutaran** ke lagu berikutnya (lihat `removeItem` → `next`).
6. **Kode room** hanya dari `makeRoomCode()`; jangan membuat alfabet sendiri.

### Migrasi database

- `supabase/schema.sql` harus **idempotent**: `create table if not exists`, `drop policy if exists`,
  dan `alter table ... add column if not exists` untuk kolom baru.
- Setiap kolom baru pada `rooms`/`queue_items` wajib:
  1. ditambahkan ke `create table`,
  2. ditambahkan sebagai `alter table ... add column if not exists`,
  3. ditambahkan ke `lib/types.ts`,
  4. diberi nilai default pada `emptyRoom()`,
  5. punya fallback di UI (`?? false`) untuk database yang belum dimigrasi.
- Jangan memakai `alter publication ... add table` tanpa pengaman saat menulis ulang skema — tabel
  yang sudah terdaftar akan memunculkan error "already member of publication" (aman, tapi
  membingungkan).

## 6. Aturan sinkronisasi & realtime

- Posisi lagu **tidak** dikirim terus-menerus. Tulis `position_ms` + `started_at` setiap kali status
  berubah (play, pause, seek, ganti lagu), lalu hitung dengan `currentPositionMs()`.
- TV hanya mengoreksi bila selisih melebihi ambang (2 detik pada perubahan state, 2,5 detik pada
  pemeriksaan 5 detik). Jangan menurunkan ambang tanpa alasan — akan menyebabkan video "gelagapan".
- Realtime Supabase memakai debounce 120 ms + polling pengaman 5 detik. Jangan menghapus polling
  tanpa menggantinya dengan mekanisme pemulihan lain.
- Presence: heartbeat 5 detik, ambang online 15–20 detik, retensi 10 menit. `memberId` tinggal di
  `sessionStorage`, nama di `localStorage` (`karaoke.name`).

## 7. Aturan audio

- Tidak ada file audio. Semua nada dibuat Web Audio (`lib/audio.ts`).
- Jingle **hanya** berbunyi di luar room. `SoundLayer` memanggil `setMusicSuppressed(true)` untuk
  pathname `/host*` dan `/r/*`. Jangan menyalakan musik di dalam room.
- Audio hanya boleh dimulai setelah interaksi pengguna (kebijakan autoplay). Jangan memanggil
  `startMusic()` di luar event handler atau efek yang dipicu interaksi.
- Tombol baru otomatis mendapat SFX (`tap`) dan animasi tekan. Untuk bunyi khusus tambahkan
  `data-sound="add|success|error|skip|toggle|join"`.
- Menambah efek suara berarti menambah nama di `SoundName`, `playSound`, dan `VIBRATION`.

## 8. Aturan tampilan TV

- Tema gelap dan layar penuh disimpan di database (`rooms.dark`, `rooms.stage`), bukan state lokal —
  supaya semua HP melihat kondisi yang sama.
- Mode layar penuh menyembunyikan topbar, banner, bar judul, dan rail; **wajib** menyisakan jalan
  keluar dari TV (`stage-exit`).
- Semua transisi panel memakai `opacity`/`transform` + `max-height`/grid transition; jangan memakai
  `display: none` (tidak bisa dianimasikan).
- Kotak QR tidak boleh ikut menggelap — tetap putih agar bisa dipindai.

## 9. Keamanan & konfigurasi

- `YOUTUBE_API_KEY` hanya boleh dibaca di route server (`app/api/**`), tidak pernah di komponen.
- Jangan commit `.env`, `.env.local`, atau kunci apa pun. Untuk Supabase gunakan **anon key** saja.
- RLS tabel memang terbuka untuk `anon` karena room publik; jangan menambahkan data pribadi ke skema
  tanpa aturan akses baru.
- Jangan menambahkan dependensi baru tanpa alasan kuat; saat ini hanya 6 dependensi runtime.

## 10. Alur verifikasi sebelum menyerahkan hasil

Minimum untuk setiap perubahan:

1. `npm run typecheck` → 0 error.
2. `npm run build` → sukses (hentikan dev server dulu).
3. Uji di browser untuk alur yang berubah:
   - Beranda 1280×720: tidak ada scroll; popup perangkat muncul di layar lebar, tidak muncul di HP.
   - TV 1280×720: `.tv-shell` tidak memicu scroll halaman.
   - HP 390×844: kartu tersusun, tombol bisa ditekan, tidak ada elemen terpotong.
4. Fitur yang menyentuh data: uji dua tab (TV + HP) di mode demo — tambah lagu, ganti status, akhiri
   room.
5. Fitur yang menyentuh Supabase: pastikan juga berjalan tanpa kolom baru (fallback `?? false`).

Jangan mengklaim sesuatu "sudah diuji" bila hanya typecheck. Sebutkan apa yang diperiksa dan apa
yang tidak.

## 11. Definition of done

- Perilaku sesuai permintaan, tanpa fitur tambahan yang tidak diminta.
- Tidak ada error typecheck/build, tidak ada warning baru di console browser.
- Berfungsi di mode Supabase **dan** mode demo.
- Tampilan TV tetap satu layar; HP tetap nyaman.
- Teks UI berbahasa Indonesia dan konsisten dengan gaya yang ada.
- Bila skema berubah: `schema.sql` idempotent + `types.ts` + `emptyRoom()` + fallback UI.
- Bila visual berubah: token CSS dipakai, mode gelap ikut diperiksa.

## 12. Hal yang sering salah

| Kesalahan | Akibat | Cara benar |
|---|---|---|
| Memanggil `supabase.from(...)` di komponen | Logika ganda, mode demo rusak | Tambah method di `Store` |
| Menyimpan mode gelap di state lokal | HP lain tidak sinkron | Simpan di `rooms.dark` |
| Menambah `display:none` untuk stage | Panel hilang mendadak, tidak ada animasi | Transisi `opacity`/`max-height` |
| Memakai `startMusic()` di dalam room | Backsound menutupi lagu | Biarkan `setMusicSuppressed` bekerja |
| Lupa cleanup channel/presence | Anggota "hantu" tetap online | `untrack()` + `removeChannel()` |
| Menulis `position_ms` saja tanpa `started_at` | Posisi membeku/berbeda antar perangkat | Selalu tulis keduanya |
| Menambah kolom DB tanpa `alter ... if not exists` | Deploy lama error saat toggle | Ikuti checklist migrasi |
| Menambah elemen tinggi di TV | Muncul scroll di layar TV | Uji 1280×720, jaga `min-height: 0` |

## 13. Gaya kerja yang diharapkan

- Ubah sesedikit mungkin file; ikuti pola yang sudah ada.
- Jangan menambahkan komentar berlebihan; jelaskan *mengapa*, bukan *apa*.
- Jangan melakukan refactor besar tanpa diminta.
- Bila menemukan bug di luar permintaan, laporkan — jangan perbaiki diam-diam.
- Bila mengubah dokumen ini atau dokumen lain, jaga konsistensi angka & nama dengan kode.
