# 01 — Product Requirements

**Produk:** Karaoke TV (TV & HP)
**Versi dokumen:** 1.0
**Status aplikasi:** live di <https://ado-karaoke-tv.vercel.app/>
**Terakhir diperbarui:** November 2026

---

## 1. Ringkasan produk

Karaoke TV adalah aplikasi web yang mengubah satu layar besar (TV, proyektor, laptop) menjadi mesin
karaoke, sementara semua orang di ruangan memakai HP masing-masing sebagai remote dan pemilih lagu.

Satu kalimat: **TV memutar, semua HP mengatur.**

## 2. Masalah yang diselesaikan

| Masalah di lapangan | Dampak | Jawaban produk |
|---|---|---|
| Satu orang memegang laptop untuk memilih lagu | Orang itu tidak bisa ikut bernyanyi/bergaul | Semua orang bisa menambah lagu dari HP sendiri, tanpa batas jumlah |
| Antrian ditulis di kertas atau diucapkan | Lagu terlewat, urutan berantakan | Antrian realtime yang terlihat di TV dan semua HP |
| Remote TV/YouTube canggung dipakai bergiliran | Perpindahan lagu lambat, salah pencet | Kontrol play/pause/seek/skip dari HP, sinkron ke TV |
| Video karaoke susah dicari di YouTube biasa | Hasil pencarian banyak yang bukan karaoke | Pencarian difilter & diberi peringkat ke versi karaoke |
| Aplikasi karaoke berbayar dan perlu instalasi | Tidak praktis untuk acara dadakan | Web app, buka tautan, pindai QR, langsung pakai |

## 3. Tujuan produk

1. Menyiapkan sesi karaoke dalam **kurang dari satu menit** tanpa registrasi.
2. Membuat **semua orang** bisa mengendalikan antrian, bukan hanya satu orang.
3. Menjaga **TV tetap jadi pusat perhatian**: video besar, tanpa scroll, tanpa kontrol berantakan.
4. Tetap **berjalan tanpa biaya** untuk pemakaian rumahan (Supabase free tier + YouTube quota gratis).

### Metrik keberhasilan (kualitatif & kuantitatif)

- Waktu dari buka situs sampai room siap: **< 15 detik**.
- Waktu dari pindai QR sampai lagu pertama diputar: **< 60 detik**.
- Rasio sesi yang berhasil menambahkan minimal 1 lagu: **> 80%**.
- Tidak ada scroll pada layar TV 1280×720 dan 1920×1080 saat room aktif.

## 4. Pengguna dan kebutuhan

### Persona 1 — Host (pemilik TV)

- **Konteks:** menyiapkan TV/laptop di ruang tamu, ingin cepat.
- **Kebutuhan:** buat room tanpa mengatur apa pun; QR besar dan mudah dipindai; kontrol darurat
  (akhiri room) tanpa dialog bertele-tele; tv tidak pernah "terkunci".
- **Frustrasi:** harus mengeklik banyak langkah, atau TV menampilkan panel yang mengganggu video.

### Persona 2 — Operator (tamu dengan HP)

- **Konteks:** baru pertama kali memakai aplikasi, mungkin sambil memegang makanan.
- **Kebutuhan:** masuk cukup dengan nama; pencarian otomatis saat mengetik; tombol besar; tahu siapa
  saja yang ada di room; bisa keluar tanpa merusak sesi orang lain.

### Persona 3 — Penonton/penyanyi

- **Kebutuhan:** melihat lagu apa yang sedang diputar dan apa berikutnya; layar TV nyaman dilihat di
  ruangan remang.

## 5. Alur utama (user journey)

### A. Membuat sesi (host)

1. Buka beranda di TV/laptop.
2. Popup "Langsung buat room?" muncul (karena terdeteksi layar besar) → tekan **⚡ Buat Room**.
3. TV menampilkan QR + kode 5 karakter dan menunggu lagu pertama.

### B. Bergabung (operator)

1. Pindai QR (kamera) atau ketik kode di beranda.
2. Popup nama muncul → isi nama → **Masuk ke room**.
3. Cari lagu → **+ Antrian** → lagu muncul di TV & semua HP.

### C. Mengelola (operator mana pun)

1. Pause/maju/mundur/skip dari HP.
2. Ubah urutan atau hapus lagu dari antrian.
3. Nyalakan mode gelap atau layar penuh video di TV.

### D. Menutup sesi

1. **Keluar room** di HP: hanya menutup HP itu.
2. **Akhiri room** di TV (satu klik) atau di HP (dengan konfirmasi): room + antrian dihapus, semua HP
   menampilkan "Room tidak ditemukan".

## 6. Ruang lingkup

### Termasuk (v1, sudah berjalan)

- Room publik berbasis kode/QR tanpa login.
- Pemutar YouTube di TV dengan antrian realtime.
- Pencarian karaoke, tambah via link, kelola antrian.
- Kontrol pemutaran dari HP dengan sinkronisasi.
- Daftar anggota room online/offline.
- Mode gelap & layar penuh video yang dikendalikan dari HP.
- Efek suara, getaran, jingle di luar room.
- Deteksi perangkat layar besar di beranda.
- Mode demo tanpa database.

### Tidak termasuk (v1)

- Login/akun pengguna, riwayat sesi, favorit lintas perangkat.
- Pemutar audio selain YouTube (Spotify, file lokal, mikrofon).
- Skor nyanyi, pitch detection, rekaman suara.
- Antrean berbayar, tiket, atau moderasi lagu.
- Aplikasi native (Android/iOS) atau PWA offline penuh.

## 7. Kebutuhan fungsional

Prioritas memakai MoSCoW: **M** must, **S** should, **C** could.

| ID | Kebutuhan | Prioritas | Kriteria penerimaan |
|---|---|---|---|
| FR-01 | Host dapat membuat room baru | M | Room mendapat kode 5 karakter unik; TV langsung menampilkan QR dan kode |
| FR-02 | Tamu dapat bergabung dengan kode atau QR | M | Kode valid membuka layar HP; kode tidak valid menampilkan pesan jelas |
| FR-03 | Tamu mengisi nama sebelum masuk | M | Popup nama tidak bisa dilewati tanpa memilih nama atau "Tamu"; nama tampil di antrian |
| FR-04 | Pencarian video karaoke otomatis saat mengetik | M | Berhenti mengetik 450 ms memicu satu permintaan; hasil diberi badge karaoke bila relevan |
| FR-05 | Menambah lagu ke antrian | M | Lagu muncul di TV dan semua HP < 2 detik (Supabase) |
| FR-06 | Lagu pertama otomatis diputar | M | Begitu antrian kosong menerima lagu, TV langsung memutar tanpa aksi tambahan |
| FR-07 | Kontrol play/pause/seek/skip dari HP | M | Aksi HP mengubah status room; TV mengikuti; tombol nonaktif saat tidak relevan |
| FR-08 | Urutkan & hapus lagu | M | Perubahan urutan tampil di semua perangkat; menghapus lagu aktif memindahkan ke lagu berikutnya |
| FR-09 | Daftar anggota room dengan status | S | Anggota baru muncul; setelah keluar/berhenti heartbeat berubah offline |
| FR-10 | Akhiri room | M | TV: satu klik. HP: dengan konfirmasi. Room & antrian terhapus; semua HP menampilkan pesan room berakhir |
| FR-11 | Keluar room dari HP | M | Hanya menutup sesi HP itu; room tetap hidup untuk yang lain |
| FR-12 | Mode gelap dari HP | S | Sakelar mengubah seluruh tampilan TV dan HP; nilai tersimpan di room |
| FR-13 | Layar penuh video dari HP | S | Panel QR/playlist/judul tersembunyi dengan animasi; tersedia jalan keluar dari TV |
| FR-14 | Efek suara & getaran pada interaksi | C | Setiap tombol memutar SFX; Android bergetar; bisa dimatikan |
| FR-15 | Jingle latar di luar room | C | Berbunyi di beranda setelah interaksi pertama; berhenti otomatis saat masuk room |
| FR-16 | Deteksi perangkat di beranda | C | TV/laptop melihat popup buat room; HP tidak; popup sekali per sesi tab |
| FR-17 | Mode demo tanpa Supabase | S | Tanpa env Supabase, aplikasi tetap bisa dipakai dua tab satu browser |
| FR-18 | Diagnostik konfigurasi | S | `/api/status` melaporkan status key YouTube dan Supabase tanpa membocorkan nilai |

## 8. Aturan bisnis

1. **Room bersifat publik.** Siapa pun dengan kode boleh masuk, mengubah antrian, dan mengakhiri room.
2. **Kode room adalah kunci.** 5 karakter dari alfabet tanpa huruf/angka ambigu (tanpa I, O, 0, 1).
3. **Satu TV, satu pemutar.** Hanya layar TV yang memutar video; HP tidak memutar audio lagu.
4. **Tidak ada antrian = tidak ada lagu.** Room menunggu sampai lagu pertama masuk.
5. **Mengakhiri room bersifat permanen.** Antrian dihapus, tidak ada undo.
6. **Jingle tidak boleh mengganggu lagu.** Musik latar mati di dalam room.

## 9. Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Kinerja | First load beranda < 3 dtk pada koneksi 4G; interaksi tombol < 100 ms |
| Realtime | Perubahan antrian terlihat < 2 dtk di semua perangkat |
| Sinkronisasi | Selisih posisi video vs acuan < 2,5 dtk (dikoreksi tiap 5 dtk) |
| Responsif | TV 1280×720 & 1920×1080 satu layar tanpa scroll; HP 360–430 px nyaman |
| Aksesibilitas | Kontras teks ≥ 4.5:1 pada tema terang & gelap; target sentuh ≥ 31 px; `aria-label` pada tombol ikon |
| Ketahanan | Koneksi putus sementara → halaman tetap tampil, indikator mode/store jelas |
| Keamanan | Tidak ada service key di klien; anon key saja; tidak menyimpan data pribadi |
| Biaya | Berjalan pada free tier Supabase + kuota YouTube gratis untuk pemakaian rumahan |
| Bahasa | Seluruh antarmuka Bahasa Indonesia, nada santai dan jelas |

## 10. Risiko dan mitigasi

| Risiko | Mitigasi saat ini |
|---|---|
| Video karaoke memblokir embed | Panduan memilih hasil lain; pemutar menampilkan placeholder yang jelas |
| Kebijakan autoplay audio browser | Tombol "Aktifkan suara" di TV + audio mulai setelah interaksi pertama |
| Kamera butuh HTTPS | Deploy ke Vercel/Netlify (HTTPS otomatis); lokal via `localhost` |
| Kuota YouTube habis | Masih bisa menambah lagu lewat link YouTube |
| Database lupa migrasi kolom baru | `schema.sql` idempotent + blok `alter table ... if not exists` |

## 11. Roadmap (usulan, belum dikerjakan)

- Riwayat sesi & lagu favorit per perangkat.
- Tampilan daftar anggota di layar TV.
- Moderasi antrian (host bisa mengunci penambahan lagu).
- Dukungan sumber video selain YouTube.
- PWA (bisa dipasang di homescreen TV/HP).

## 12. Glosarium

| Istilah | Arti |
|---|---|
| Room | Sesi karaoke dengan kode 5 karakter |
| Host | Layar TV yang membuat room dan memutar video |
| Operator | Pengguna HP yang menambah & mengatur lagu |
| Snapshot | Potret data room + antrian pada satu waktu |
| Presence | Mekanisme kehadiran realtime untuk status online/offline |
| Stage / layar penuh | Mode TV yang menyembunyikan semua panel selain video |
