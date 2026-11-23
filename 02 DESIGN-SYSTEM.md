# 02 — Design System

**Produk:** Karaoke TV (TV & HP)
**Sumber kebenaran:** `app/globals.css`
**Versi:** 1.0 · November 2026

Semua warna, ukuran, dan komponen di bawah ini adalah yang benar-benar dipakai aplikasi. Kalau nilai
di CSS berubah, perbarui dokumen ini agar tidak menyesatkan.

---

## 1. Prinsip desain

1. **Cerah dan hangat, bukan neon.** Latar krem dengan gradasi pink–teal–kuning muda. Warna kuat
   dipakai sebagai aksen (tombol utama, angka penting), bukan sebagai latar seluruh halaman.
2. **TV dulu, HP menyusul.** Layar TV harus "jadi panggung": video besar, panel kecil di sisi kanan,
   tanpa scroll. HP boleh memanjang dan kaya kontrol.
3. **Satu aksi utama per kartu.** Setiap kartu punya satu tombol paling penting; sisanya netral.
4. **Terasa hidup tapi tidak berisik.** Setiap tombol bereaksi (pop + ripple + bunyi), animasi besar
   hanya untuk perpindahan mode (layar penuh, modal, mode gelap).
5. **Jelas lebih penting daripada pintar.** Label Bahasa Indonesia sederhana, tanpa istilah teknis.

## 2. Token warna

### Tema terang (default)

| Token | Nilai | Pemakaian |
|---|---|---|
| `--bg` | `#fdf8f4` | Latar halaman |
| `--surface` | `#ffffff` | Permukaan kartu |
| `--surface-soft` | `#fbf6f2` | Latar sekunder: baris antrian, input, stat |
| `--ink` | `#241c33` | Teks utama |
| `--ink-soft` | `#4a4159` | Teks isi |
| `--muted` | `#7d7391` | Teks sekunder, metadata |
| `--line` | `#f0e7e1` | Garis pemisah halus |
| `--line-strong` | `#e6dcd6` | Border tombol/input/chip |
| `--pink` | `#ff4d8d` | Aksen utama, gradasi tombol |
| `--orange` | `#ff8a3d` | Ujung gradasi tombol utama |
| `--violet` | `#7c5cff` | Aksen gradasi teks |
| `--teal` | `#0fb3a1` | Status online / positif |
| `--sun` | `#ffc857` | Aksen hangat tambahan |

Gradasi khas:

```css
/* Tombol utama */
background: linear-gradient(135deg, var(--pink), var(--orange));

/* Teks sorotan */
background: linear-gradient(115deg, var(--pink) 8%, var(--violet) 58%, var(--teal));

/* Latar halaman (body, fixed) */
radial-gradient(880px 480px at 6% -12%, #ffe2ee, transparent 62%),
radial-gradient(780px 460px at 98% -4%, #dff7f2, transparent 60%),
radial-gradient(760px 520px at 50% 108%, #fff1d6, transparent 62%);
```

### Tema gelap (dikendalikan dari HP, class `html.room-dark`)

| Token | Nilai | Catatan |
|---|---|---|
| `--bg` | `#0b0912` | Latar gelap |
| `--surface` | `#16121f` | Kartu gelap |
| `--surface-soft` | `#1c1728` | Permukaan sekunder |
| `--ink` | `#f7f2ff` | Teks utama |
| `--ink-soft` | `#ded5ef` | Teks isi |
| `--muted` | `#a89cc0` | Teks sekunder |
| `--line` | `rgba(255,255,255,.09)` | Garis pemisah |
| `--line-strong` | `rgba(255,255,255,.16)` | Border kontrol |

Aturan tambahan tema gelap:

- Kartu memakai `rgba(22,18,31,.92)` agar gradasi latar tetap samar terlihat.
- Tombol netral menjadi `#211a30`; hover `#2b2140`.
- Bar judul lagu di kartu pemutar memakai `#16121f` (bukan putih).
- **Kotak QR tetap putih** (`#ffffff`) agar selalu bisa dipindai.
- Status gelap disimpan di database (`rooms.dark`), bukan hanya di perangkat.

## 3. Tipografi

- Font: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
  Tidak ada webfont eksternal — cepat dan tahan offline.
- Anti-aliasing aktif (`-webkit-font-smoothing: antialiased`).

| Peran | Ukuran | Ketebalan | Catatan |
|---|---|---|---|
| Judul beranda | `clamp(26px, 2.9vw, 42px)` | 800 | Letter-spacing −0.03em, satu baris di TV |
| Judul layar TV (now playing) | 16–17px | 800 | Terpotong maksimal 1–2 baris |
| Judul kartu | 18–22px | 800 | |
| Judul baris antrian | 12.5–13px | 700 | Maksimal 2 baris (`line-clamp`) |
| Isi / paragraf | 14–14.5px | 400 | Line-height 1.55 |
| Label kecil | 11–12.5px | 500–600 | Metadata, hint, tombol kecil |
| Label seksi | 11.5px | 700 | Uppercase, letter-spacing 0.08em, warna muted |
| Angka besar (stat) | 26px+ | 800 | Gradasi pink→violet |

Skala responsif memakai `clamp()` untuk judul; ukuran teks lain tetap agar hierarki tidak goyah.

## 4. Spasi, radius, bayangan

| Token | Nilai | Pemakaian |
|---|---|---|
| Jarak antar kartu (HP) | 12px | `stack` gap |
| Jarak grid TV | 14px | `.tv-grid` |
| Padding kartu | 20px (TV ringkas 14–18px) | `.card` |
| Radius kartu | 20px | `--radius` |
| Radius tombol | 13px (kecil 11px) | `.btn` |
| Radius chip | 999px | Pil |
| Bayangan halus | `0 6px 18px -12px rgba(63,32,92,.4)` | `--shadow-sm` |
| Bayangan kartu | `0 22px 45px -34px rgba(63,32,92,.55)` | `--shadow` |

Prinsip bayangan: lembut dan rendah kontras; tidak ada bayangan gelap pekat atau efek glow neon.

## 5. Layout

### Beranda (`home-shell`)

- Tinggi `100dvh`, maksimal 1320 px, `overflow: hidden` di layar TV.
- Struktur: topbar → hero (logo + judul + paragraf) → grid 2 kartu → fitur → catatan → footer.
- Hero dua kolom: logo di kiri (115–186 px tinggi), teks di kanan. Di ≤900 px menjadi tumpukan
  tengah.
- Target: **satu layar penuh tanpa scroll** pada 1280×720 dan 1920×1080.

### Layar TV (`tv-shell`)

- Tinggi `100dvh`, grid dua kolom `minmax(0,1fr) 370px`.
- Kolom kiri: pemutar video + bar judul lagu. Kolom kanan: kartu QR ringkas + playlist.
- Semua panel memakai `min-height: 0` dan scroll internal, bukan scroll halaman.

### Layar HP (`phone-shell`)

- Lebar maksimal 560 px, padding 16/14 px, boleh scroll.
- Urutan kartu: sedang diputar → tampilan TV → anggota room → pencarian → antrian → aksi room.

### Modal

- Overlay `name-gate`: latar `rgba(24,12,36,.42)` + `backdrop-filter: blur(6px)`, konten di tengah
  dengan lebar maksimal 420 px.

### Mode layar penuh video (`tv-shell.is-stage`)

- Topbar, banner, bar judul, dan rail kanan memudar/terlipat; grid menjadi `1fr 0px`.
- Video memenuhi layar; muncul chip kecil "Keluar layar penuh" di kiri bawah (opasitas 16%, terang
  saat hover) sebagai jalan keluar darurat.

## 6. Komponen

### Tombol (`.btn`)

| Varian | Tampilan |
|---|---|
| `.btn` | Permukaan putih, border `--line-strong`, teks `--ink`, radius 13px |
| `.btn-primary` | Gradasi pink→oranye, teks putih, bayangan pink lembut |
| `.btn-danger` | Varian bahaya (akhiri room) — latar merah muda lembut, teks merah tua |
| `.btn-sm` | Padding 8×13 px, font 12.5px, radius 11px |
| `.btn-block` | Lebar 100% |

State: hover terangkat 2 px & sedikit membesar; active mengecil 0.955; `:disabled` opasitas 0.45
tanpa bayangan. Semua tombol mendapat kelas `is-tapped` saat diklik → animasi `tap-pop` (0.44 s) dan
ripple putih dari titik klik (`--tap-x`, `--tap-y`).

### Kartu (`.card`)

Kartu putih semi transparan (`rgba(255,255,255,.94)`) dengan border `--line`, radius 20px, padding
20px, bayangan lembut. Semua konten halaman dibungkus kartu — tidak ada teks liar di atas gradasi.

### Chip (`.chip`)

Pil kecil untuk kode room, status store, jumlah online, nama pengguna. Varian: `.chip-demo`
(kuning), `.chip-success` (teal), `.chip-mini` (lebih kecil, tanpa bayangan), `.chip-name` (bisa
diklik untuk ganti nama).

### Input (`.input`)

Latar `--surface-soft`, border `--line-strong`, radius 12px, padding 11–13 px. Placeholder muted.
Fokus: border pink + ring lembut. Input kode room memakai huruf kapital dengan letter-spacing lebar.

### Sakelar (`.switch`)

Pil 54×30 px, kenop putih 22 px yang meluncur 24 px saat aktif. Aktif = gradasi pink→oranye.
Dipakai di kartu **Tampilan TV** dengan `role="switch"` dan `aria-checked`.

### Baris antrian (`.queue-row`)

Flex: indeks/ikon status → thumbnail 56×35 (radius 8) → judul + metadata → tombol aksi. Baris aktif
memakai gradasi pink lembut + border pink. Di TV, padding dan tinggi lebih rapat.

### Chip anggota (`.member`)

Pil dengan titik status 7 px. Online: teal dengan animasi pulse 2.4 s. Offline: opasitas 62%.
Anggota saat ini ditandai "(kamu)".

### Tombol kontrol HP (`.control-btn`)

Grid 4 kolom, ikon di atas label, radius 14px. Varian utama (`.control-btn-main`) bergradasi
pink→oranye untuk play/pause.

### Dock suara (`.sound-dock`)

Dua tombol bulat melayang di kanan bawah: 🎵 (musik latar) dan 🔔 (efek + getar). Musik disembunyikan
di dalam room. Hover terangkat 2 px.

### Modal nama & modal perangkat

Kartu terpusat dengan judul tebal, satu paragraf penjelasan, lalu aksi utama + aksi sekunder. Muncul
dengan animasi `gate-pop` 0.32 s (naik 14 px + skala 0.96 → 1).

## 7. Motion

| Kejadian | Durasi | Easing |
|---|---|---|
| Tekan tombol (`tap-pop`) | 0.44 s | `cubic-bezier(.22,1.3,.36,1)` |
| Ripple klik | 0.55 s | `ease-out` |
| Hover tombol | 0.18 s | `cubic-bezier(.22,1.2,.36,1)` |
| Modal masuk | 0.32 s | `cubic-bezier(.22,1.3,.36,1)` |
| Layar penuh video (grid & panel) | 0.4–0.5 s | `cubic-bezier(.22,1,.36,1)` |
| Fade jingle saat masuk/keluar room | 0.7–1.4 s | linear |
| Logo mengapung | 7 s loop | `ease-in-out` (±6 px) |
| Pulse titik online | 2.4 s loop | `ease-in-out` |

Aturan:

- Animasi hanya untuk memberi umpan balik atau menjelaskan perpindahan, bukan dekorasi terus-menerus.
- Semua animasi besar dimatikan pada `prefers-reduced-motion: reduce`.
- Transformasi memakai `transform`/`opacity` (bukan `top/left`) agar tetap 60 fps.

## 8. Suara sebagai bagian desain

| Kejadian | Nada | Getaran (Android) |
|---|---|---|
| Tombol umum | Dua nada pendek (760/1140 Hz) | 8 ms |
| Tambah lagu | Nada naik (523→784 Hz) | 12-26-12 |
| Berhasil | Tiga nada (659/880/1175 Hz) | 10-40-14 |
| Masuk room | Arpeggio (523/659/784 Hz) | 10-30-10-30-14 |
| Gagal / akhiri room | Nada turun (233→175 Hz) | 45-40-45 |
| Skip | 880→587 Hz | 16 ms |
| Toggle | 440/660 Hz | 10 ms |

Jingle latar: progresi Cmaj7–G–Am7–Fmaj7, tempo satu akor per 3,36 detik, hanya di luar room.

## 9. Aksesibilitas

- Kontras teks utama ≥ 4.5:1 di tema terang maupun gelap.
- Tombol ikon selalu punya `aria-label` (contoh: "Scan QR code", "Mode gelap di TV").
- Sakelar memakai `role="switch"` + `aria-checked`; modal memakai `role="dialog"` + `aria-modal`.
- Target sentuh minimal 31×31 px; tombol utama 44 px ke atas.
- Fokus keyboard terlihat pada tombol dan input (ring pink lembut).
- Status tidak pernah hanya dibedakan warna: chip anggota memakai teks/opasitas, tombol nonaktif
  memakai opasitas.

## 10. Do & Don't

**Do**

- Pakai token CSS (`var(--pink)`, `var(--ink)`) — jangan hardcode warna baru.
- Letakkan teks di dalam `.card`, dan ukur ulang layar TV 1280×720 setelah menambah elemen.
- Beri `data-sound="..."` pada tombol yang butuh bunyi khusus.
- Sembunyikan kontrol yang tidak relevan (mis. tombol seek saat tidak ada lagu) dengan `disabled`.

**Don't**

- Jangan menambah gradient gelap/neon atau bayangan tebal — melanggar karakter "cerah hangat".
- Jangan membuat komponen TV yang butuh scroll halaman.
- Jangan memakai warna sebagai satu-satunya penanda status.
- Jangan menaruh animasi loop di area video atau di dekat kendali utama.
