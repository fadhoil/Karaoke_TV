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
  const [ended, setEnded] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);

  const room = snap?.room ?? null;
  const isStage = Boolean(room?.stage);
  const current = snap?.items.find((item) => item.id === room?.now_item_id) ?? null;
  const activeItems = snap ? snap.items.filter((item) => item.status !== 'done') : [];
  const totalMinutes = Math.round(
    activeItems.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0) / 60,
  );

  useEffect(() => {
    if (!code) return;
    setJoinUrl(`${window.location.origin}/r/${code}`);
  }, [code]);

  // Mode gelap diatur dari HP lewat data room, jadi semua layar ikut berubah.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('room-dark', Boolean(room?.dark));
    return () => root.classList.remove('room-dark');
  }, [room?.dark]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    setLoading(true);

    const stop = store.subscribe(code, (next) => {
      if (!alive) return;
      if (!next) {
        setSnap(null);
        setLoading(false);
        setEnded(true);
        return;
      }
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

  async function endRoom() {
    try {
      await store.endRoom(code);
      try {
        playerRef.current?.stopVideo();
      } catch {
        /* ignore */
      }
      setSnap(null);
      setEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengakhiri room.');
    }
  }

  if (ended) {
    return (
      <main className="page">
        <div className="topbar">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Karaoke Room
          </Link>
        </div>
        <div className="card center stack" style={{ padding: 40 }}>
          <div className="brand-dot" style={{ margin: '0 auto 10px' }} />
          <h2>Room {code} sudah diakhiri</h2>
          <p className="muted small">
            Sesi dan seluruh antrian sudah dihapus. Semua HP yang terhubung otomatis keluar dari
            room.
          </p>
          <button
            className="btn btn-primary"
            data-sound="join"
            onClick={() => window.location.assign('/host')}
          >
            Buat room baru
          </button>
          <Link className="btn" href="/">
            Kembali ke halaman awal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`tv-shell ${isStage ? 'is-stage' : ''}`}>
      <div className="topbar tv-topbar">
        <div className="tv-brand">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Karaoke Room
          </Link>
          <span className="chip">
            Room <strong>{code}</strong>
          </span>
          <span className={`chip ${getStoreMode() === 'demo' ? 'chip-demo' : 'chip-success'}`}>
            {getStoreMode() === 'demo' ? '● Mode demo' : '● Supabase'}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm" data-sound="toggle" onClick={goFullscreen}>
            ⛶ Layar penuh
          </button>
          <button className="btn btn-sm btn-danger" data-sound="error" onClick={() => void endRoom()}>
            Akhiri room
          </button>
          <button className="btn btn-sm" onClick={() => window.location.assign('/host')}>
            Room baru
          </button>
        </div>
      </div>

      {error ? <p className="notice notice-error">{error}</p> : null}

      {getStoreMode() === 'demo' ? (
        <p className="notice tv-banner">
          Mode demo: Supabase belum diset — HP hanya bisa terhubung dari browser yang sama (buka{' '}
          <code>/r/{code}</code> di tab kedua). Cek <code>/api/status</code>.
        </p>
      ) : null}

      <div className="tv-grid">
        <div className="tv-stage">
          <div className="card player-card">
            <div className="player-frame">
              <div id="yt-host" />
              {!current ? (
                <div className="player-placeholder">
                  <strong>{loading ? 'Memuat room…' : 'Belum ada lagu'}</strong>
                  <span className="small">
                    Pindai QR di kanan untuk request lagu karaoke dari HP mana pun.
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
                    : 'Lagu pertama yang masuk akan diputar otomatis'}
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
                  disabled={activeItems.length === 0}
                >
                  ⏭ Berikutnya
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="tv-rail">
          <div className="card qr-card qr-card-compact">
            <div className="qr-head">
              {joinUrl ? (
                <div className="qr-box">
                  <img
                    src={`/api/qr?text=${encodeURIComponent(joinUrl)}`}
                    alt={`QR code untuk bergabung ke room ${code}`}
                  />
                </div>
              ) : null}
              <div className="qr-info">
                <div className="section-title" style={{ marginBottom: 2 }}>
                  Gabung dari HP
                </div>
                <div className="room-code">{code}</div>
                <p className="qr-hint">
                  Pindai QR atau buka <code>/r/{code}</code>, lalu cari lagu karaoke.
                </p>
              </div>
            </div>
            <div className="qr-actions">
              <button className="btn btn-sm" data-sound="success" onClick={copyLink}>
                {copied ? 'Tersalin ✓' : '🔗 Salin link'}
              </button>
            </div>
          </div>

          <div className="card tv-playlist">
            <div className="tv-list-head">
              <span className="section-title" style={{ margin: 0 }}>
                Playlist
              </span>
              <span className="chip chip-mini">
                {activeItems.length} lagu{totalMinutes > 0 ? ` · ${totalMinutes} mnt` : ''}
              </span>
            </div>

            <div className="tv-list">
              {activeItems.length === 0 ? (
                <p className="queue-empty">
                  Antrian masih kosong. Semua HP bisa menambah lagu kapan saja — lagu pertama
                  langsung diputar.
                </p>
              ) : (
                activeItems.map((item, index) => {
                  const isCurrent = item.id === room?.now_item_id;
                  return (
                    <div className={`queue-row ${isCurrent ? 'is-current' : ''}`} key={item.id}>
                      <span className="queue-index">
                        {isCurrent ? (room?.is_playing ? '▶' : '❚❚') : index + 1}
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
                  );
                })
              )}
            </div>

            <p className="tv-list-foot muted">
              {room?.is_playing ? 'Sedang diputar' : 'Jeda'} · room {code}
            </p>
          </div>
        </aside>
      </div>

      {isStage ? (
        <button
          type="button"
          className="stage-exit"
          data-sound="toggle"
          onClick={() => void store.setRoomView(code, { stage: false })}
        >
          ⤡ Keluar layar penuh
        </button>
      ) : null}
    </main>
  );
}
