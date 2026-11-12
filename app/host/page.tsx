'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getStore } from '@/lib/store';

export default function HostCreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const store = getStore();
    store
      .createRoom('Karaoke Room')
      .then((code) => router.replace(`/host/${code}`))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal membuat room.');
      });
  }, [router]);

  return (
    <main className="page">
      <div className="topbar">
        <span className="brand">
          <span className="brand-dot" />
          Karaoke Room
        </span>
      </div>
      <div className="card center" style={{ padding: 40 }}>
        {error ? (
          <>
            <h2 style={{ marginBottom: 8 }}>Room gagal dibuat</h2>
            <p className="muted small">{error}</p>
          </>
        ) : (
          <>
            <div className="brand-dot" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: 6 }}>Menyiapkan room…</h2>
            <p className="muted small">Sebentar lagi TV akan menampilkan QR code.</p>
          </>
        )}
      </div>
    </main>
  );
}
