'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getStoreMode, isSupabaseConfigured } from '@/lib/store';

const FEATURES = [
  {
    icon: '📱',
    title: 'HP tanpa batas',
    text: 'Semua orang di ruangan bisa request lagu dari HP masing-masing.',
  },
  {
    icon: '⚡',
    title: 'Antrian realtime',
    text: 'Lagu masuk ke TV dalam hitungan detik, tanpa refresh.',
  },
  {
    icon: '🎤',
    title: 'Filter karaoke',
    text: 'Hasil pencarian otomatis diprioritaskan ke versi minus one.',
  },
  {
    icon: '🔗',
    title: 'Bisa dari link',
    text: 'Punya video favorit? Tempel link YouTube-nya langsung.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) {
      setError('Kode room biasanya 5 karakter. Cek lagi ya.');
      return;
    }
    router.push(`/r/${clean}`);
  }

  return (
    <main className="page">
      <div className="topbar">
        <span className="brand">
          <span className="brand-dot" />
          Karaoke Room
        </span>
        <div className="topbar-actions">
          <span className={`chip ${isSupabaseConfigured ? 'chip-success' : 'chip-demo'}`}>
            {getStoreMode() === 'supabase' ? '● Supabase aktif' : '● Mode demo lokal'}
          </span>
        </div>
      </div>

      <section className="hero">
        <span className="hero-badge">🎶 Karaoke bareng, TV jadi panggungnya</span>
        <h1>
          Nyalakan TV, <span>nyanyi bareng</span> semuanya.
        </h1>
        <p>
          TV memutar video karaoke, HP siapa pun mengatur antrian. Pindai QR code, cari lagu, tekan
          tambah — TV langsung memutarnya. Tanpa instal aplikasi, tanpa batas jumlah HP.
        </p>
      </section>

      <div className="landing-grid">
        <section className="card landing-card list-card">
          <h2>Saya di TV · Host</h2>
          <p>
            Buat room baru. TV menampilkan QR code + kode 5 karakter, lalu memutar lagu satu per
            satu sesuai antrian.
          </p>
          <ol className="steps">
            <li>Klik Buat Room, tampilkan halaman ini di layar TV.</li>
            <li>Minta semua orang memindai QR di layar.</li>
            <li>Lagu pertama yang di-request langsung diputar.</li>
          </ol>
          <button
            className="btn btn-primary btn-block"
            data-sound="join"
            onClick={() => router.push('/host')}
          >
            Buat Room di TV
          </button>
        </section>

        <section className="card landing-card">
          <h2>Saya di HP · Operator</h2>
          <p>
            Masukkan kode room dari layar TV atau pindai QR-nya. Setelah masuk, HP bisa mencari lagu
            karaoke, menyusun antrian, dan mengontrol pemutaran.
          </p>
          <form onSubmit={join} className="stack" style={{ marginTop: 'auto' }}>
            <input
              className="input input-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="KODE"
              maxLength={8}
              aria-label="Kode room"
            />
            {error ? <p className="notice notice-error">{error}</p> : null}
            <button className="btn btn-block" type="submit" data-sound="join">
              Gabung ke Room
            </button>
          </form>
          <p className="small muted">
            Contoh kode: <strong>AB7K2</strong> — ada di bawah QR code pada layar TV.
          </p>
        </section>
      </div>

      <div className="features">
        {FEATURES.map((feature) => (
          <div className="feature" key={feature.title}>
            <span className="feature-icon">{feature.icon}</span>
            <div>
              <strong>{feature.title}</strong>
              <p>{feature.text}</p>
            </div>
          </div>
        ))}
      </div>

      {!isSupabaseConfigured ? (
        <p className="notice" style={{ marginTop: 18 }}>
          <strong>Mode demo aktif:</strong> Supabase belum dikonfigurasi, jadi room hanya tersimpan
          di browser ini. Buka TV dan HP sebagai dua tab agar bisa saling terhubung. Isi{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> untuk
          memakai HP sungguhan.
        </p>
      ) : null}

      <p className="footer-note">
        Next.js + Supabase · Video dari YouTube · Cocok untuk TV, proyektor, atau laptop
      </p>
    </main>
  );
}
