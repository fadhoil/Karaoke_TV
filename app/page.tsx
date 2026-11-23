'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import QrScanner from '@/components/QrScanner';
import { getStoreMode, isSupabaseConfigured } from '@/lib/store';

const FEATURES = [
  { icon: '📱', label: 'HP tanpa batas' },
  { icon: '⚡', label: 'Antrian realtime' },
  { icon: '🎤', label: 'Filter karaoke' },
  { icon: '🔗', label: 'Tambah dari link' },
];

type DeviceKind = 'tv' | 'desktop';

const HOST_PROMPT_KEY = 'karaoke.hostPrompted';

// Tebak perangkat layar besar: TV pintar atau laptop/desktop tanpa sentuhan.
function detectLargeDevice(): DeviceKind | null {
  if (typeof window === 'undefined') return null;

  const ua = navigator.userAgent;
  if (
    /(smart-?tv|smarttv|googletv|android tv|appletv|bravia|tizen|webos|hbbtv|opera tv|aft[bmst]|crkey|firetv|roku)/i.test(
      ua,
    )
  ) {
    return 'tv';
  }

  const touch = navigator.maxTouchPoints > 0;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (window.innerWidth >= 1024 && !touch && finePointer) return 'desktop';

  return null;
}

function QrIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20.5 14v2.5M14 20.5h2.5M20.5 20.5H21" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devicePrompt, setDevicePrompt] = useState<DeviceKind | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Di TV/laptop langsung tawarkan buat room, sekali per sesi tab.
  useEffect(() => {
    const kind = detectLargeDevice();
    if (!kind) return;
    try {
      if (window.sessionStorage.getItem(HOST_PROMPT_KEY)) return;
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setDevicePrompt(kind), 500);
    return () => window.clearTimeout(timer);
  }, []);

  function rememberPrompt() {
    try {
      window.sessionStorage.setItem(HOST_PROMPT_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  function createRoomNow() {
    rememberPrompt();
    setCreatingRoom(true);
    router.push('/host');
  }

  function dismissDevicePrompt() {
    rememberPrompt();
    setDevicePrompt(null);
  }

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
    <main className="home-shell">
      <div className="topbar home-topbar">
        <span className="brand">
          <span className="brand-dot" />
          Karaoke Room
        </span>
        <span className={`chip ${isSupabaseConfigured ? 'chip-success' : 'chip-demo'}`}>
          {getStoreMode() === 'supabase' ? '● Supabase aktif' : '● Mode demo lokal'}
        </span>
      </div>

      <section className="home-hero">
        <img
          className="home-logo"
          src="/logo.png"
          width={820}
          height={557}
          alt="Karaoke TV — Nyanyi Bersama, Dimana Saja!"
        />
        <div className="home-hero-copy">
          <h1>
            Nyalakan TV, <span>nyanyi bareng</span> semuanya.
          </h1>
          <p>
            TV memutar video karaoke, HP siapa pun mengatur antrian. Pindai QR, cari lagu, tekan
            tambah — TV langsung memutarnya.
          </p>
        </div>
      </section>

      <div className="home-grid">
        <section className="card home-card">
          <span className="home-kicker">🎬 Untuk layar TV</span>
          <h2>Buat room, tampilkan QR</h2>
          <p>
            TV menampilkan QR code + kode 5 karakter, lalu memutar lagu satu per satu sesuai
            antrian.
          </p>
          <ol className="home-steps">
            <li>Klik Buat Room, tampilkan di layar TV.</li>
            <li>Minta semua orang memindai QR di layar.</li>
            <li>Lagu pertama langsung diputar otomatis.</li>
          </ol>
          <div className="home-visual" aria-hidden="true">
            <span className="home-visual-screen">
              <span className="home-play">▶</span>
              <span className="home-eq">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="home-visual-label">
              Video karaoke diputar penuh di layar TV
            </span>
          </div>
          <button
            className="btn btn-primary btn-block"
            data-sound="join"
            onClick={() => router.push('/host')}
          >
            Buat Room di TV
          </button>
        </section>

        <section className="card home-card">
          <span className="home-kicker">📱 Untuk HP · operator</span>
          <h2>Gabung & pilih lagu</h2>
          <p>Pindai QR di layar TV, atau masukkan kode room-nya.</p>

          <form className="join-inline" onSubmit={join}>
            <input
              className="input"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="KODE"
              maxLength={8}
              aria-label="Kode room"
            />
            <button
              type="button"
              className="qr-icon-btn"
              onClick={() => setScanning(true)}
              aria-label="Scan QR code"
              title="Scan QR code"
              data-sound="join"
            >
              <QrIcon />
            </button>
            <button className="btn btn-primary" type="submit" data-sound="join">
              Gabung
            </button>
          </form>

          {error ? <p className="notice notice-error home-notice">{error}</p> : null}

          <p className="home-hint">
            Ketik kode 5 karakter dari layar TV, atau tekan ikon QR untuk memindai. Contoh:{' '}
            <strong>AB7K2</strong>
          </p>
          <div className="home-devices" aria-hidden="true">
            <span>📱 Budi</span>
            <span>📱 Sinta</span>
            <span>📱 Rudi</span>
            <span className="home-device-more">+ HP lain, bebas</span>
          </div>
        </section>
      </div>

      <div className="home-features">
        {FEATURES.map((feature) => (
          <div className="home-feature" key={feature.label}>
            <span>{feature.icon}</span>
            {feature.label}
          </div>
        ))}
      </div>

      {!isSupabaseConfigured ? (
        <p className="notice home-notice">
          <strong>Mode demo:</strong> Supabase belum diset — TV dan HP harus dua tab di browser yang
          sama. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
          untuk memakai HP sungguhan.
        </p>
      ) : null}

      <p className="home-foot">
        Next.js + Supabase · Video dari YouTube · Cocok untuk TV, proyektor, atau laptop
      </p>

      {devicePrompt ? (
        <div className="name-gate" role="dialog" aria-modal="true" aria-label="Buat room baru">
          <div className="card device-gate">
            <span className="home-kicker">
              {devicePrompt === 'tv' ? '📺 Terdeteksi layar TV' : '💻 Terdeteksi laptop / desktop'}
            </span>
            <h2>Langsung buat room?</h2>
            <p className="small muted">
              Layar ini cocok jadi pemutar karaoke. Buat room sekarang, lalu TV langsung menampilkan
              QR code untuk semua HP.
            </p>
            <button
              className="btn btn-primary btn-block"
              data-sound="join"
              onClick={createRoomNow}
              disabled={creatingRoom}
            >
              {creatingRoom ? 'Menyiapkan room…' : '⚡ Buat Room'}
            </button>
            <button className="btn btn-block" onClick={dismissDevicePrompt}>
              Nanti saja
            </button>
          </div>
        </div>
      ) : null}

      {scanning ? (
        <QrScanner
          onResult={(scannedCode) => {
            setScanning(false);
            router.push(`/r/${scannedCode}`);
          }}
          onClose={() => setScanning(false)}
        />
      ) : null}
    </main>
  );
}
