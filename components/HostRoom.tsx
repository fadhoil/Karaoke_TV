'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { currentPositionMs, formatTime } from '@/lib/playback';
import { getStore, getStoreMode } from '@/lib/store';
import type { Snapshot } from '@/lib/types';

type YTPlayer = {
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getVideoData: () => { video_id?: string };
  stopVideo: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLElement,
        options: Record<string, unknown>,
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<NonNullable<Window['YT']>> | null = null;

function loadYouTubeApi(): Promise<NonNullable<Window['YT']>> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('YouTube API tidak siap'));
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('Gagal memuat YouTube'));
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export default function HostRoom({ code }: { code: string }) {
  const store = useMemo(() => getStore(), []);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);

  const room = snap?.room ?? null;
  const current = snap?.items.find((item) => item.id === room?.now_item_id) ?? null;
  const upNext = snap
    ? snap.items
        .filter((item) => item.id !== room?.now_item_id && item.status !== 'done')
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const activeItems = snap ? snap.items.filter((item) => item.status !== 'done') : [];
  const totalMinutes = Math.round(
    activeItems.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0) / 60,
  );

  useEffect(() => {
    if (!code) return;
    setJoinUrl(`${window.location.origin}/r/${code}`);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    setLoading(true);

    const stop = store.subscribe(code, (next) => {
      if (!alive) return;
      setSnap(next);
      setLoading(false);
      setError(null);
    });

    store
      .getRoom(code)
      .then((snapshot) => {
        if (!alive) return;
        setLoading(false);
        if (!snapshot) setError(`Room ${code} tidak ditemukan.`);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Gagal memuat room.');
      });

    return () => {
      alive = false;
      stop();
    };
  }, [code, store]);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player('yt-host', {
          playerVars: {
            playsinline: 1,
            rel: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => setPlayerReady(true),
            onStateChange: (event: { data?: number }) => {
              if (event.data === 0) void store.next(code);
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError('Pemutar YouTube gagal dimuat. Periksa koneksi internet TV.');
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [code, store]);

  // Terapkan status room (lagu, play/pause, posisi) ke pemutar TV.
  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player || !room) return;

    if (!current) {
      try {
        player.stopVideo();
      } catch {
        /* ignore */
      }
      return;
    }

    const target = currentPositionMs(room) / 1000;
    const loadedId = player.getVideoData?.()?.video_id;

    if (loadedId !== current.video_id) {
      if (room.is_playing) {
        player.loadVideoById({ videoId: current.video_id, startSeconds: target });
      } else {
        player.cueVideoById({ videoId: current.video_id, startSeconds: target });
      }
      return;
    }

    const now = player.getCurrentTime?.() ?? 0;
    if (Math.abs(now - target) > 2) player.seekTo(target, true);

    if (room.is_playing) player.playVideo();
    else player.pauseVideo();
  }, [
    playerReady,
    current,
    room,
    room?.updated_at,
    room?.is_playing,
    room?.now_item_id,
    room?.position_ms,
    room?.started_at,
  ]);

  // Koreksi drift tiap beberapa detik supaya TV tetap sinkron dengan HP.
  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !room?.is_playing || !current) return;
      const target = currentPositionMs(room) / 1000;
      const now = player.getCurrentTime?.() ?? 0;
      if (Math.abs(now - target) > 2.5) player.seekTo(target, true);
    }, 5000);
    return () => window.clearInterval(id);
  }, [room, current]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function unlockAudio() {
    const player = playerRef.current;
    try {
      player?.unMute();
      player?.setVolume(100);
      if (room?.is_playing) player?.playVideo();
    } catch {
      /* ignore */
    }
    setAudioOn(true);
  }

  function goFullscreen() {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <main className="page">
      <div className="topbar">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          Karaoke Room
        </Link>
        <div className="topbar-actions">
          <span className="chip">
            Room <strong>{code}</strong>
          </span>
          <span className={`chip ${getStoreMode() === 'demo' ? 'chip-demo' : 'chip-success'}`}>
            {getStoreMode() === 'demo' ? '● Mode demo lokal' : '● Tersambung Supabase'}
          </span>
          <button className="btn btn-sm" data-sound="toggle" onClick={goFullscreen}>
            ⛶ Layar penuh
          </button>
          <button className="btn btn-sm" onClick={() => window.location.assign('/host')}>
            Room baru
          </button>
        </div>
      </div>

      {error ? <p className="notice notice-error" style={{ marginBottom: 16 }}>{error}</p> : null}
      {getStoreMode() === 'demo' ? (
        <p className="notice" style={{ marginBottom: 16 }}>
          Mode demo: Supabase belum diset, jadi HP hanya bisa terhubung dari browser yang sama
          (buka <code>/r/{code}</code> di tab kedua).
        </p>
      ) : null}

      <div className="host-grid">
        <div className="stack">
          <div className="card player-card">
            <div className="player-frame">
              <div id="yt-host" />
              {!current ? (
                <div className="player-placeholder">
                  <strong>Belum ada lagu</strong>
                  <span className="small">
                    Pindai QR code di samping untuk request lagu karaoke dari HP.
                  </span>
                </div>
              ) : null}
            </div>
            <div className="now-bar">
              <div style={{ minWidth: 0 }}>
                <div className="now-title">{current?.title ?? (loading ? 'Memuat room…' : 'Menunggu request')}</div>
                <div className="now-sub">
                  {current
                    ? `${current.channel ?? 'YouTube'} · ${formatTime(current.duration_seconds)} · request dari ${current.added_by ?? 'anonim'}`
                    : 'Playlist akan tampil di sini begitu lagu pertama masuk'}
                </div>
              </div>
              <div className="host-actions">
                {!audioOn ? (
                  <button className="btn btn-sm btn-primary" data-sound="success" onClick={unlockAudio}>
                    🔊 Aktifkan suara
                  </button>
                ) : null}
                <button
                  className="btn btn-sm"
                  data-sound="skip"
                  onClick={() => void store.next(code)}
                  disabled={!current && upNext.length === 0}
                >
                  Lagu berikutnya ⏭
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{activeItems.length}</div>
                <div className="stat-label">Lagu di antrian</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totalMinutes > 0 ? `${totalMinutes}m` : '—'}</div>
                <div className="stat-label">Estimasi durasi</div>
              </div>
              <div className="stat">
                <div className="stat-value">{room?.is_playing ? '▶' : '❚❚'}</div>
                <div className="stat-label">{room?.is_playing ? 'Sedang diputar' : 'Jeda'}</div>
              </div>
            </div>
            <div className="section-title">Antrian berikutnya</div>
            {upNext.length === 0 ? (
              <p className="queue-empty">Antrian masih kosong. Semua HP bisa menambah lagu kapan saja.</p>
            ) : (
              <div className="queue">
                {upNext.map((item, index) => (
                  <div className="queue-row" key={item.id}>
                    <span className="muted small" style={{ width: 18, textAlign: 'right' }}>
                      {index + 1}
                    </span>
                    {item.thumbnail ? (
                      <img className="queue-thumb" src={item.thumbnail} alt="" />
                    ) : (
                      <span className="queue-thumb" />
                    )}
                    <div className="queue-main">
                      <div className="queue-title">{item.title}</div>
                      <div className="queue-meta">
                        <span>{item.added_by ?? 'anonim'}</span>
                        <span>{formatTime(item.duration_seconds)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="sidebar">
          <div className="card qr-card">
            <div className="section-title">Pindai untuk gabung</div>
            {joinUrl ? (
              <div className="qr-box">
                <img
                  src={`/api/qr?text=${encodeURIComponent(joinUrl)}`}
                  alt={`QR code untuk bergabung ke room ${code}`}
                />
              </div>
            ) : null}
            <div className="room-code">{code}</div>
            <p className="qr-hint">
              Atau buka <strong>{joinUrl.replace(/^https?:\/\//, '')}</strong> dan masukkan kode di
              atas.
            </p>
            <div className="qr-steps">
              <div>
                <b>1</b> Pindai QR pakai kamera HP
              </div>
              <div>
                <b>2</b> Cari judul lagu karaoke
              </div>
              <div>
                <b>3</b> Tekan <b>+ Antrian</b> — TV langsung memutar
              </div>
            </div>
            <a className="join-link" href={joinUrl} target="_blank" rel="noreferrer">
              {joinUrl}
            </a>
            <button
              className="btn btn-sm btn-block"
              style={{ marginTop: 10 }}
              data-sound="success"
              onClick={copyLink}
            >
              {copied ? 'Link tersalin ✓' : 'Salin link'}
            </button>
          </div>

          <div className="card">
            <div className="section-title">Sedang diputar</div>
            {current ? (
              <div className="result">
                {current.thumbnail ? (
                  <img className="result-thumb" src={current.thumbnail} alt="" />
                ) : null}
                <div className="queue-main">
                  <div className="queue-title">{current.title}</div>
                  <div className="queue-meta">
                    <span>{current.added_by ?? 'anonim'}</span>
                    <span>{room?.is_playing ? '▶ diputar' : '⏸ jeda'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="queue-empty">Belum ada lagu yang diputar.</p>
            )}
            <p className="small muted" style={{ marginTop: 12 }}>
              Total di antrian: {(snap?.items.length ?? 0)} lagu
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
