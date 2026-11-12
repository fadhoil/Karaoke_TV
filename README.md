# Karaoke Room — TV + HP

Aplikasi karaoke streaming dua perangkat:

- **TV (host)** membuat room, menampilkan QR code / kode room, dan memutar video karaoke dari YouTube.
- **HP (operator)** — jumlahnya bebas — memindai QR, mencari lagu karaoke, menyusun antrian, dan mengontrol play/pause/seek/skip.

Semua sinkron lewat Supabase Realtime.

## 1. Setup Supabase (sekali saja)

1. Buat project gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat tabel `rooms` dan `queue_items`, mengaktifkan Realtime, dan membuka akses publik
   (room bersifat publik; kode room adalah "kata sandi"-nya).
3. Buka **Project Settings → API**, salin:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Setup pencarian YouTube (opsional tapi disarankan)

1. Buka [Google Cloud Console](https://console.cloud.google.com/), buat project.
2. Aktifkan **YouTube Data API v3**.
3. Buat **API key**, isi ke `YOUTUBE_API_KEY`.

Tanpa key ini, pencarian nonaktif tetapi menambah lagu lewat **link YouTube** tetap jalan.

## 3. Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi ketiga variabel
npm run dev
```

Buka `http://localhost:3000`.

> Jika Supabase belum diisi, aplikasi masuk **mode demo**: room disimpan di browser, jadi TV dan HP
> harus dua tab di browser yang sama.

## 4. Deploy

### Vercel

```bash
npm i -g vercel
vercel
```

Atau: import repo ke [vercel.com/new](https://vercel.com/new), lalu tambahkan 3 environment variable
di **Settings → Environment Variables**, dan deploy.

### Netlify

Import repo ke [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing
project**. Framework terdeteksi sebagai Next.js otomatis (`@netlify/plugin-nextjs`). Tambahkan
environment variable yang sama di **Site configuration → Environment variables**.

Setelah deploy, buka `https://domain-kamu/` di TV, tekan **Buat Room di TV**, lalu pindai QR dari HP.

## Struktur

```
app/
  page.tsx                 landing: buat room / gabung
  host/page.tsx            membuat room lalu redirect ke /host/[code]
  host/[code]/page.tsx     layar TV: QR, pemutar YouTube, antrian
  r/[code]/page.tsx        layar HP: pencarian, antrian, kontrol
  api/youtube/search       pencarian + filter karaoke
  api/youtube/video        baca judul dari link YouTube
  api/qr                   generator QR (SVG)
lib/
  store/                   abstraksi data: Supabase & demo lokal
  playback.ts              perhitungan posisi lagu
supabase/schema.sql        skema database
```

## Suara & getaran

- Semua efek suara dan jingle latar disintesis langsung di browser (Web Audio API) — tidak ada file
  audio, jadi ringan dan bebas lisensi.
- Jingle latar berulang otomatis setelah interaksi pertama (kebijakan autoplay browser) dan berhenti
  saat tab disembunyikan.
- Tombol bulat di kanan bawah: 🎵 musik latar, 🔔 efek suara + getaran. Pilihan tersimpan di
  browser.
- Getaran memakai `navigator.vibrate`: jalan di Android/Chrome; iOS Safari belum mendukung getaran
  web.
- Tombol bisa diberi suara khusus dengan atribut `data-sound="add|success|skip|toggle|join|error"`.

## Catatan

- Sinkronisasi memakai acuan `started_at` + `position_ms` di tabel `rooms`, jadi TV mengoreksi drift
  otomatis tiap 5 detik meski ada HP yang telat menekan tombol.
- Beberapa video karaoke memblokir embed. Jika lagu tidak bisa diputar, ganti dengan hasil lain.
- TV perlu sekali klik **Aktifkan suara** karena kebijakan autoplay browser.
- Room lama bisa dibersihkan: `delete from rooms where updated_at < now() - interval '12 hours';`
