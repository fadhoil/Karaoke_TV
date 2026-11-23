# 03 — Architecture

**Produk:** Karaoke TV (TV & HP)
**Versi dokumen:** 1.0 · November 2026
**Live:** <https://ado-karaoke-tv.vercel.app/>

---

## 1. Ringkasan

Aplikasi ini adalah **Next.js 15 App Router** satu repo, tanpa backend terpisah. Semua logika bisnis
berjalan di browser; server hanya dipakai untuk tiga hal: menyembunyikan API key YouTube, membuat QR
SVG, dan memberi diagnostik environment.

Data room & antrian disimpan di **Supabase (Postgres + Realtime)**. Bila env Supabase kosong, aplikasi
otomatis memakai **backend demo** (`localStorage` + `BroadcastChannel`) sehingga bisa dicoba tanpa
akun.

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  TV  /host/[code]        │        │  HP  /r/[code]           │
│  HostRoom.tsx            │        │  ControllerRoom.tsx      │
│  - YouTube IFrame player │        │  - pencarian, antrian    │
│  - QR + playlist         │        │  - kontrol, anggota      │
└───────────┬──────────────┘        └───────────┬──────────────┘
            │                                   │
            └──────────────┬────────────────────┘
                           ▼
                ┌─────────────────────┐
                │  lib/store (Store)  │  antarmuka tunggal
                │  core.ts            │  createRoom, addItem,
                │                     │  setPlayback, next, ...
                └───────┬─────────────┘
                        ▼
             ┌──────────────────────┐
             │  Backend + Watcher   │
             ├──────────┬───────────┤
             │ Supabase │  Demo     │
             │ Postgres │ localStorage
             │ Realtime │ BroadcastChannel
             │ Presence │ Presence lokal
             └──────────┴───────────┘
```

## 2. Peta route

| Route | Tipe | Peran |
|---|---|---|
| `/` | Client | Beranda: buat room, gabung dengan kode, pindai QR, popup deteksi perangkat |
| `/host` | Client | Membuat room sekali, lalu `router.replace('/host/KODE')` |
| `/host/[code]` | Client | Layar TV: pemutar YouTube, QR, playlist, kontrol host |
| `/r/[code]` | Client | Layar HP: nama, pencarian, antrian, kontrol, anggota, tampilan TV |
| `/api/qr` | Server (Node) | Mengembalikan QR SVG untuk URL join (`?text=`) |
| `/api/youtube/search` | Server (Node) | Pencarian YouTube + filter & ranking karaoke (`?q=`) |
| `/api/youtube/video` | Server (Node) | Metadata video dari URL (`?url=`) via oEmbed + durasi |
| `/api/status` | Server (Node) | Diagnostik env: key YouTube, Supabase, mode store |

Semua route halaman adalah komponen client karena membutuhkan `window`, YouTube IFrame API,
`AudioContext`, kamera, dan realtime browser.

## 3. Lapisan data (`lib/store`)

Store sengaja dipisah menjadi empat berkas agar sumber data bisa diganti tanpa menyentuh UI.

### `core.ts` — `Store` (logika domain)

Antarmuka yang dipakai semua komponen:

```ts
type Store = {
  mode: 'supabase' | 'demo';
  createRoom(name: string): Promise<string>;
  getRoom(code: string): Promise<Snapshot | null>;
  subscribe(code: string, cb: (s: Snapshot | null) => void): () => void;
  subscribeMembers(code, me, cb): () => void;
  addItem(code, input): Promise<void>;
  removeItem(code, id): Promise<void>;
  moveItem(code, id, direction: -1 | 1): Promise<void>;
  setPlayback(code, patch): Promise<void>;
  next(code): Promise<void>;
  setRoomView(code, patch: { dark?: boolean; stage?: boolean }): Promise<void>;
  endRoom(code): Promise<void>;
  clearPending(code): Promise<void>;
};
```

`createStore(backend, watch, watchMembers)` menggabungkan tiga dependensi:

- `backend` — operasi baca/tulis data.
- `watch` — langganan perubahan snapshot.
- `watchMembers` — langganan presence anggota.

Logika penting di lapisan ini:

- `addItem` menaikkan `sort_order` sebesar 100 dan **langsung memutar** lagu bila room belum punya
  lagu aktif.
- `next` menandai lagu sekarang `done`, memilih lagu berikutnya (`status != 'done'`), lalu menulis
  `now_item_id`, `is_playing`, `position_ms = 0`, `started_at = now`.
- `removeItem` pada lagu aktif otomatis memanggil alur `next`.
- `moveItem` menukar `sort_order` dua lagu bertetangga.
- `setRoomView` menyimpan preferensi tampilan TV (gelap / layar penuh) di record room.

### `backend.ts` — kontrak penyimpanan

```ts
type Backend = {
  mode: StoreMode;
  createRoom(name): Promise<string>;
  read(code): Promise<Snapshot | null>;
  insertItem(item): Promise<void>;
  updateItem(id, patch): Promise<void>;
  deleteItem(id): Promise<void>;
  deleteRoom(code): Promise<void>;
  updateRoom(code, patch): Promise<void>;
};
```

Juga berisi `emptyRoom()` (factory room baru) dan `makeRoomCode()` yang memakai
`crypto.getRandomValues` dengan alfabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (tanpa karakter ambigu).

### `supabase.ts` — backend produksi

- Klien dibuat dengan anon key; `read` mengambil `rooms` (single row by `code`) + `queue_items`
  (urut `sort_order`).
- `createRoom` mencoba maksimal 6 kode, mengulang saat error unik `23505`.
- `deleteRoom` menghapus item dulu lalu room (relasi `on delete cascade` juga tersedia).
- `watch` membuka channel `karaoke-KODE`, mendengarkan `postgres_changes` untuk tabel `rooms` dan
  `queue_items`, lalu melakukan **refresh ter-debounce 120 ms**; ditambah polling pengaman tiap 5
  detik.
- `watchMembers` memakai **Realtime Presence** dengan key `memberId`. State presence dipetakan menjadi
  `RoomMember[]`; anggota tanpa heartbeat > 20 detik menjadi `online: false`, > 10 menit dihapus.

### `demo.ts` — backend tanpa Supabase

- Snapshot ditulis ke `localStorage['karaoke.demo.KODE']`.
- Sinkronisasi antar tab memakai `BroadcastChannel('karaoke-demo')` + event `storage`.
- Presence lokal memakai `BroadcastChannel('karaoke-presence')` dengan ping 5 detik, ambang online
  15 detik, retensi 10 menit.
- Cocok untuk mencoba alur; **tidak** menyinkronkan antar perangkat.

### `index.ts` — pemilihan backend

```ts
getStore()      // Supabase bila URL+anon key ada, jika tidak → demo
getStoreMode()  // 'supabase' | 'demo'
isSupabaseConfigured
```

Store di-cache satu instance per dokumen (`let cached`).

## 4. Model data

### Tabel `rooms`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `code` | text PK | 5 karakter, kunci room |
| `name` | text | Nama room (default "Karaoke Room") |
| `now_item_id` | uuid | Lagu yang sedang diputar |
| `is_playing` | boolean | Status putar |
| `position_ms` | bigint | Posisi saat status terakhir diubah |
| `started_at` | timestamptz | Acuan waktu untuk menghitung posisi |
| `dark` | boolean | Mode gelap TV |
| `stage` | boolean | Layar penuh video TV |
| `created_at`, `updated_at` | timestamptz | Audit & pembersihan |

### Tabel `queue_items`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid PK | Dibuat klien (`crypto.randomUUID`) |
| `room_code` | text FK → rooms | Cascade delete |
| `video_id`, `title`, `channel`, `thumbnail` | text | Metadata YouTube |
| `duration_seconds` | integer | Untuk estimasi & progress |
| `added_by` | text | Nama operator |
| `status` | text | `pending` \| `playing` \| `done` (check constraint) |
| `sort_order` | bigint | Urutan antrian |
| `created_at` | timestamptz | |

RLS: kedua tabel dibuka untuk `anon` (room publik, kode sebagai kata sandi). Realtime publication
diaktifkan untuk keduanya.

## 5. Sinkronisasi pemutaran

Tidak ada kirim posisi terus-menerus. Room menyimpan dua nilai: `position_ms` dan `started_at`
(waktu ISO saat status terakhir berubah). Posisi dihitung di setiap perangkat:

```ts
// lib/playback.ts
currentPositionMs(room) =
  room.is_playing && room.started_at
    ? room.position_ms + (Date.now() - Date.parse(room.started_at))
    : room.position_ms;
```

- **HP** menampilkan progress dari fungsi yang sama, dengan tick 1 detik.
- **TV** membandingkan `player.getCurrentTime()` dengan acuan; bila selisih > 2 detik, `seekTo`.
  Pengoreksian tambahan berjalan tiap 5 detik (ambang 2,5 detik).
- Play/pause dari HP menulis `position_ms` terbaru + `started_at` baru, sehingga semua perangkat
  sepakat tanpa saling menimpa.

Efek samping yang disengaja: perangkat yang baru bergabung langsung tahu posisi lagu tanpa meminta
state tambahan.

## 6. Presence anggota

1. HP membuat `memberId` di `sessionStorage` (bertahan selama tab hidup).
2. Setelah nama diisi, HP memanggil `store.subscribeMembers(code, {id, name}, cb)`.
3. Supabase: `channel.track({ name })` saat `SUBSCRIBED`; `presenceState()` dipetakan ke daftar dengan
   `online` berdasarkan usia heartbeat.
4. Demo: ping BroadcastChannel tiap 5 detik; anggota lain menandai `leave` saat unmount.
5. Saat komponen dilepas (keluar room / tab ditutup), `untrack` + `removeChannel` dijalankan.

## 7. Mesin audio (`lib/audio.ts`)

- Satu `AudioContext` global; bus `master` → `sfxBus` dan `musicBus`.
- Efek suara adalah osilator pendek (`voice()`), tanpa file audio.
- Jingle dijadwalkan maju (~1,4 detik look-ahead) dengan `setInterval` 250 ms; progresi akor
  Cmaj7–G–Am7–Fmaj7.
- `initAudioPrefs()` membaca `localStorage['karaoke.sound.prefs']` (`music`, `effects`).
- `setMusicSuppressed(true)` dipanggil di dalam room (`/host*`, `/r/*`) sehingga jingle berhenti;
  `nudgeMusic()` memulihkan audio yang sempat di-suspend browser.
- `SoundLayer` memasang listener global `pointerdown`/`keydown` (unlock autoplay) dan
  `visibilitychange`/`focus`/`pageshow` (pemulihan), lalu memberi kelas `is-tapped` + variabel
  `--tap-x/--tap-y` pada tombol yang diklik untuk animasi ripple.

## 8. API routes

| Route | Sumber | Catatan |
|---|---|---|
| `/api/qr?text=` | `qrcode` | Mengembalikan `image/svg+xml`; dipakai TV untuk QR join |
| `/api/youtube/search?q=` | YouTube Data API v3 | Filter & ranking karaoke (kata kunci, durasi, judul); 503 bila key belum diset |
| `/api/youtube/video?url=` | oEmbed + API | Menormalkan link YouTube, mengambil judul/channel/thumbnail/durasi |
| `/api/status` | env | `force-dynamic`, `cache-control: no-store`; hanya menampilkan cuplikan key |

Semua route memakai `runtime = 'nodejs'` dan hanya berjalan di server, sehingga `YOUTUBE_API_KEY`
tidak pernah sampai ke browser.

## 9. Konfigurasi & deployment

- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `YOUTUBE_API_KEY`.
- `next.config.mjs`: `eslint.ignoreDuringBuilds`, `devIndicators: false`, `allowedDevOrigins` untuk
  host preview saat pengembangan.
- Deploy: Vercel (aplikasi live) atau Netlify. Supabase dibuat sekali, skema dijalankan lewat SQL
  Editor; perubahan skema bersifat idempotent (`create table if not exists`,
  `alter table ... add column if not exists`).
- Karena halaman bersifat client, deploy hanya butuh Node runtime standar Vercel — tidak ada cron,
  queue, atau worker.

## 10. Alur kegagalan & penanganan

| Gejala | Sebab umum | Penanganan |
|---|---|---|
| "Pencarian belum aktif" (503) | `YOUTUBE_API_KEY` kosong/tidak terbaca | Isi env, restart dev / redeploy; cek `/api/status` |
| Room tidak ditemukan di HP | Room diakhiri, atau mode demo di browser berbeda | Buat room baru; untuk multi-perangkat isi env Supabase |
| Suara TV tidak keluar | Kebijakan autoplay | Tekan "Aktifkan suara" sekali di TV |
| Video tidak bisa diputar | Embed diblokir pemilik video | Pilih hasil lain |
| Sakelar tampilan TV error | Kolom `dark`/`stage` belum ada di database | Jalankan migrasi `alter table` di `schema.sql` |
| Layar TV jadi scroll | Elemen baru menambah tinggi | Periksa `.tv-shell` (100dvh + min-height:0) dan uji 1280×720 |

## 11. Titik ekstensi

- **Sumber video lain**: tambahkan implementasi pemutar di `HostRoom` dan normalisasi data di
  `addItem`.
- **Backend lain (Firebase/Postgres sendiri)**: cukup buat implementasi `Backend` baru dan daftarkan
  di `lib/store/index.ts`; UI tidak perlu diubah.
- **Fitur akun/riwayat**: tambahkan tabel baru + RLS berbasis user, lalu perluas `Store`.
- **PWA**: tambahkan manifest + service worker; halaman client sudah siap.
