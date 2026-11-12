# Panduan Deploy — Karaoke Room

Ikuti urutan ini. Total waktu ±15 menit, semuanya gratis.

---

## Bagian 1 — Siapkan Supabase (5 menit)

1. Buka **https://supabase.com** → **Start your project** → daftar dengan GitHub/email.
2. Klik **New project**.
   - Name: `karaoke-room`
   - Database Password: klik **Generate a password** lalu simpan (tidak dipakai aplikasi, tapi dicatat).
   - Region: pilih **Southeast Asia (Singapore)** kalau kamu di Indonesia.
   - Klik **Create new project**, tunggu ±2 menit sampai provisioning selesai.
3. Di sidebar kiri, klik **SQL Editor** → **New query**.
4. Buka file `supabase/schema.sql` dari folder proyek, **salin seluruh isinya**, tempel ke editor, klik **Run**.
   Kalau berhasil akan muncul **"Success. No rows returned"**.
5. Klik **Project Settings** (ikon gerigi di bawah) → **API**. Catat dua nilai:
   - **Project URL** → contoh `https://abcdefgh.supabase.co`
   - **anon public** (di bagian Project API keys) → string panjang berawalan `eyJ...`

> Catatan keamanan: tabel dibuka untuk `anon` karena tamu tidak login. Kode room 5 karakter berfungsi
> sebagai "kata sandi". Ini cocok untuk karaoke rumahan, bukan untuk menyimpan data sensitif.

---

## Bagian 2 — Siapkan API key YouTube (3 menit, opsional)

Tanpa langkah ini aplikasi tetap jalan: pencarian mati, tapi tambah lagu lewat **link YouTube** tetap bisa.

1. Buka **https://console.cloud.google.com** → login dengan akun Google.
2. Klik dropdown project di atas → **New project** → nama `karaoke-room` → **Create** → pilih project itu.
3. Menu ☰ → **APIs & Services** → **Library** → cari **YouTube Data API v3** → **Enable**.
4. Menu ☰ → **APIs & Services** → **Credentials** → **+ Create credentials** → **API key**.
5. Salin key (contoh `AIzaSy...`). Tidak perlu membatasi apa pun untuk pemakaian pribadi.
6. Kuota gratis 10.000 unit/hari — cukup untuk ratusan pencarian.

---

## Bagian 3 — Upload ke GitHub (2 menit)

Vercel mengambil kode dari GitHub, jadi zip-nya perlu di-upload dulu.

1. Ekstrak `karaoke-room.zip` ke folder di komputer.
2. Buka **https://github.com/new**.
   - Repository name: `karaoke-room`
   - Pilih **Private** (bebas, keduanya bisa).
   - **Create repository**.
3. Di halaman repo kosong, klik **uploading an existing file**.
4. Buka folder hasil ekstrak, **pilih semua isi di dalamnya** (bukan foldernya), lalu tarik ke browser.
   Pastikan `package.json` ikut ter-upload dan **tidak** ada folder `node_modules`.
5. Klik **Commit changes**.

Alternatif tanpa GitHub: install **Vercel CLI** lalu jalankan `vercel` di folder proyek.

---

## Bagian 4 — Deploy di Vercel (3 menit)

1. Buka **https://vercel.com** → **Sign up** → **Continue with GitHub** → izinkan akses repo.
2. Klik **Add New…** → **Project** → cari `karaoke-room` → **Import**.
3. Di halaman konfigurasi:
   - **Framework Preset**: otomatis **Next.js** (biarkan).
   - **Root Directory**: biarkan kosong.
   - **Build Command** dan **Output Directory**: biarkan default.
4. Buka **Environment Variables**, tambahkan tiga baris ini (nama harus persis):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key dari Supabase |
   | `YOUTUBE_API_KEY` | API key YouTube (kalau dilewati, jangan dibuat) |

   Pilih **All Environments** untuk masing-masing (Preview + Production).
5. Klik **Deploy**, tunggu ±1–2 menit sampai muncul **Congratulations**.
6. Klik **Visit** — aplikasi terbuka di `https://karaoke-room-xxxx.vercel.app`.

> Kalau nanti mengganti nilai environment variable, buka **Settings → Environment Variables**, ubah,
> lalu **Deployments → … → Redeploy**. Perubahan env tidak berlaku tanpa redeploy.

---

## Bagian 5 — Uji di TV dan HP (2 menit)

1. Buka URL Vercel di **browser TV / laptop yang tersambung ke TV**, klik **Buat Room di TV**.
2. Akan muncul QR code + kode 5 huruf, plus tombol **🔊 Aktifkan suara** (klik sekali — browser wajib
   interaksi sebelum boleh memutar audio).
3. Pindai QR dengan kamera HP (atau buka URL `/r/KODE` dan ketik kodenya).
4. Di HP: isi nama → cari lagu, misal `bewhy gottasadae karaoke` → tekan **+ Antrian**.
5. Video langsung diputar di TV. Coba tombol ⏸/▶, −10s/+10s, dan ⏭ dari HP.
6. Buka HP kedua dengan QR yang sama — keduanya bisa menambah lagu bersamaan.

Kalau lagu tidak mau diputar, kemungkinan pemilik video memblokir embed; pilih hasil lain.

---

## Masalah yang sering muncul

| Gejala | Penyebab & solusi |
|---|---|
| Halaman bilang **"Mode demo lokal"** | Env Supabase belum terbaca. Pastikan nama variabel persis, lalu **Redeploy**. |
| **"Room tidak ditemukan"** | Kode salah ketik, atau `schema.sql` belum dijalankan sehingga tabel tidak ada. |
| Pencarian error **"YOUTUBE_API_KEY belum aktif"** | Env `YOUTUBE_API_KEY` kosong atau belum redeploy. |
| **"Kuota habis"** | Kuota YouTube harian habis; tambah lagu lewat link atau tunggu besok. |
| TV diam walau lagu diputar | Klik tombol **🔊 Aktifkan suara** di halaman TV. |
| Musik latar mengganggu | Klik tombol 🎵 di kanan bawah untuk mematikannya. |

---

## Setelah deploy

- Ganti domain: **Settings → Domains** di Vercel, tambahkan domain sendiri.
- Bersihkan room lama secara berkala di Supabase SQL Editor:
  `delete from rooms where updated_at < now() - interval '12 hours';`
- Biaya: Vercel hobby & Supabase free tier cukup untuk pemakaian rumahan.
