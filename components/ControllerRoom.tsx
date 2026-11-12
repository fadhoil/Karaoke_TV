'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { currentPositionMs, formatTime } from '@/lib/playback';
import { getStore, getStoreMode } from '@/lib/store';
import type { SearchResult, Snapshot } from '@/lib/types';

const NAME_KEY = 'karaoke.name';

export default function ControllerRoom({ code }: { code: string }) {
  const store = useMemo(() => getStore(), []);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [, setTick] = useState(0);

  const room = snap?.room ?? null;
  const current = snap?.items.find((item) => item.id === room?.now_item_id) ?? null;
  const queue = snap
    ? snap.items
        .filter((item) => item.status !== 'done')
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    setLoading(true);

    const stop = store.subscribe(code, (next) => {
      if (!alive) return;
      setSnap(next);
      setLoading(false);
      setNotFound(false);
    });

    store
      .getRoom(code)
      .then((snapshot) => {
        if (!alive) return;
        setLoading(false);
        if (!snapshot) setNotFound(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoading(false);
        setActionError(err instanceof Error ? err.message : 'Gagal memuat room.');
      });

    return () => {
      alive = false;
      stop();
    };
  }, [code, store]);

  function updateName(value: string) {
    setName(value);
    try {
      window.localStorage.setItem(NAME_KEY, value);
    } catch {
      /* ignore */
    }
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Aksi gagal, coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;

    setSearching(true);
    setSearchError(null);
    setSearched(true);
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(keyword)}`);
      const data = (await response.json()) as { results?: SearchResult[]; error?: string };
      if (!response.ok) {
        setResults([]);
        setSearchError(data.error ?? 'Pencarian gagal.');
      } else {
        const found = data.results ?? [];
        setResults(found);
        if (found.length === 0) {
          setSearchError('Tidak ada video karaoke yang cocok. Coba kata kunci lain.');
        }
      }
    } catch {
      setSearchError('Tidak bisa menghubungi server pencarian.');
    } finally {
      setSearching(false);
    }
  }

  async function addResult(result: SearchResult) {
    await run(result.videoId, async () => {
      await store.addItem(code, {
        video_id: result.videoId,
        title: result.title,
        channel: result.channel,
        thumbnail: result.thumbnail,
        duration_seconds: result.durationSeconds,
        added_by: name.trim() || 'Tamu',
      });
      setAdded(result.videoId);
      window.setTimeout(() => {
        setAdded((value) => (value === result.videoId ? null : value));
      }, 1600);
    });
  }

  async function addByLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = link.trim();
    if (!value) return;

    setAddingLink(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/youtube/video?url=${encodeURIComponent(value)}`);
      const data = (await response.json()) as {
        videoId?: string;
        title?: string;
        channel?: string;
        thumbnail?: string;
        durationSeconds?: number | null;
        error?: string;
      };
      if (!response.ok || !data.videoId) {
        setSearchError(data.error ?? 'Link tidak bisa dibaca.');
        return;
      }
      await store.addItem(code, {
        video_id: data.videoId,
        title: data.title ?? 'Video karaoke',
        channel: data.channel ?? null,
        thumbnail: data.thumbnail ?? null,
        duration_seconds: data.durationSeconds ?? null,
        added_by: name.trim() || 'Tamu',
      });
      setLink('');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Gagal menambah dari link.');
    } finally {
      setAddingLink(false);
    }
  }

  async function togglePlay() {
    await run('toggle', async () => {
      if (!snap) return;
      if (!snap.room.now_item_id) {
        await store.next(code);
        return;
      }
      const position = currentPositionMs(snap.room);
      await store.setPlayback(code, {
        is_playing: !snap.room.is_playing,
        position_ms: position,
        started_at: new Date().toISOString(),
      });
    });
  }

  async function seek(seconds: number) {
    await run('seek', async () => {
      if (!snap || !current) return;
      const durationMs = (current.duration_seconds ?? 0) * 1000;
      let next = Math.max(0, currentPositionMs(snap.room) + seconds * 1000);
      if (durationMs > 0) next = Math.min(next, Math.max(0, durationMs - 400));
      await store.setPlayback(code, {
        position_ms: next,
        started_at: new Date().toISOString(),
      });
    });
  }

  const positionMs = room ? currentPositionMs(room) : 0;
  const durationSeconds = current?.duration_seconds ?? 0;
  const progress = durationSeconds > 0 ? Math.min(100, (positionMs / (durationSeconds * 1000)) * 100) : 0;
  const queueMinutes = Math.round(
    queue.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0) / 60,
  );

  if (!code || notFound) {
    return (
      <main className="phone-shell">
        <div className="topbar">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Karaoke Room
          </Link>
        </div>
        <div className="card center stack">
          <h2>Room tidak ditemukan</h2>
          <p className="muted small">
            Kode <strong>{code || '—'}</strong> tidak aktif. Pastikan TV sudah membuka room dan
            ulangi pindai QR code.
          </p>
          <Link className="btn btn-primary" href="/">
            Kembali ke awal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="phone-shell">
      <div className="topbar">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          Karaoke Room
        </Link>
        <div className="topbar-actions">
          <span className="chip">
            Room <strong>{code}</strong>
          </span>
          {getStoreMode() === 'demo' ? (
            <span className="chip chip-demo">● Demo</span>
          ) : (
            <span className="chip chip-success">● Tersambung</span>
          )}
        </div>
      </div>

      <div className="stack">
        <div className="card" style={{ padding: 14 }}>
          <label className="section-title" htmlFor="player-name">
            Nama kamu (tampil di antrian)
          </label>
          <input
            id="player-name"
            className="input"
            value={name}
            onChange={(event) => updateName(event.target.value)}
            placeholder="Contoh: Budi"
            maxLength={24}
          />
        </div>

        {actionError ? <p className="notice notice-error">{actionError}</p> : null}

        <section className="card now-card">
          <div className="section-title">Sedang diputar di TV</div>
          {current ? (
            <>
              <div className="now-head">
                {current.thumbnail ? (
                  <img className="now-thumb" src={current.thumbnail} alt="" />
                ) : null}
                <div className="queue-main">
                  <div className="now-title" style={{ fontSize: 15 }}>
                    {current.title}
                  </div>
                  <div className="queue-meta">
                    <span>{current.added_by ?? 'anonim'}</span>
                    <span>{room?.is_playing ? '▶ playing' : '⏸ paused'}</span>
                  </div>
                </div>
              </div>
              <div className="progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="time-row">
                <span>{formatTime(positionMs / 1000)}</span>
                <span>{formatTime(durationSeconds)}</span>
              </div>
            </>
          ) : (
            <p className="queue-empty">
              Belum ada lagu yang diputar. Tambahkan lagu pertama dari pencarian di bawah — TV akan
              langsung memutarnya.
            </p>
          )}

          <div className="controls">
            <button className="control-btn" onClick={() => void seek(-10)} disabled={!current}>
              <span>⏪</span>
              <span>-10s</span>
            </button>
            <button
              className="control-btn control-btn-main"
              data-sound="toggle"
              onClick={() => void togglePlay()}
            >
              <span>{room?.is_playing ? '⏸' : '▶'}</span>
              <span>{room?.is_playing ? 'Pause' : 'Play'}</span>
            </button>
            <button className="control-btn" onClick={() => void seek(10)} disabled={!current}>
              <span>⏩</span>
              <span>+10s</span>
            </button>
            <button
              className="control-btn"
              data-sound="skip"
              onClick={() => void run('next', () => store.next(code))}
              disabled={queue.filter((item) => item.id !== current?.id).length === 0}
            >
              <span>⏭</span>
              <span>Skip</span>
            </button>
          </div>
        </section>

        <section className="card">
          <div className="section-title">Cari lagu karaoke</div>
          <form className="search-form" onSubmit={submitSearch}>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Judul lagu / penyanyi"
              aria-label="Cari lagu karaoke"
            />
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? '…' : 'Cari'}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: 8 }}>
            Hasil difilter otomatis ke video karaoke (minus one, instrumental, tanpa vokal).
          </p>

          <details className="details-toggle">
            <summary>Tambah dari link YouTube</summary>
            <form className="search-form" style={{ marginTop: 10 }} onSubmit={addByLink}>
              <input
                className="input"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                aria-label="Link YouTube"
              />
              <button className="btn" type="submit" data-sound="add" disabled={addingLink}>
                {addingLink ? '…' : 'Tambah'}
              </button>
            </form>
          </details>

          {searchError ? (
            <p className="notice" style={{ marginTop: 12 }}>
              {searchError}
            </p>
          ) : null}

          {results.length > 0 ? (
            <div className="results">
              {results.map((result) => (
                <div className="result" key={result.videoId}>
                  <img className="result-thumb" src={result.thumbnail} alt="" />
                  <div className="queue-main">
                    <div className="queue-title">{result.title}</div>
                    <div className="queue-meta">
                      <span>{result.channel}</span>
                      <span>{formatTime(result.durationSeconds)}</span>
                      {result.isKaraoke ? <span className="badge">karaoke</span> : null}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    data-sound="add"
                    onClick={() => void addResult(result)}
                    disabled={busy === result.videoId}
                  >
                    {added === result.videoId ? '✓' : busy === result.videoId ? '…' : '+ Antrian'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {searched && !searching && results.length === 0 && !searchError ? (
            <p className="queue-empty">Belum ada hasil.</p>
          ) : null}
        </section>

        <section className="card">
          <div className="section-title">Antrian lagu</div>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{queue.length}</div>
              <div className="stat-label">Lagu menunggu</div>
            </div>
            <div className="stat">
              <div className="stat-value">{queueMinutes > 0 ? `${queueMinutes}m` : '—'}</div>
              <div className="stat-label">Estimasi durasi</div>
            </div>
            <div className="stat">
              <div className="stat-value">TV</div>
              <div className="stat-label">Pemutar utama</div>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="queue-empty">
              Antrian kosong. Semua orang bisa menambah lagu dari HP masing-masing tanpa batas.
            </p>
          ) : (
            <div className="queue" style={{ maxHeight: 420 }}>
              {queue.map((item, index) => {
                const isCurrent = item.id === room?.now_item_id;
                return (
                  <div className={`queue-row ${isCurrent ? 'is-current' : ''}`} key={item.id}>
                    <span className="muted small" style={{ width: 18, textAlign: 'right' }}>
                      {isCurrent ? '▶' : index + 1}
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
                    <button
                      className="icon-btn"
                      aria-label="Naikkan"
                      disabled={isCurrent || index === 0}
                      onClick={() => void run(`up-${item.id}`, () => store.moveItem(code, item.id, -1))}
                    >
                      ↑
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Turunkan"
                      disabled={isCurrent || index === queue.length - 1}
                      onClick={() => void run(`down-${item.id}`, () => store.moveItem(code, item.id, 1))}
                    >
                      ↓
                    </button>
                    <button
                      className="icon-btn icon-btn-danger"
                      aria-label="Hapus dari antrian"
                      onClick={() => void run(`del-${item.id}`, () => store.removeItem(code, item.id))}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {loading ? <p className="small muted center">Menghubungkan ke room…</p> : null}
      </div>
    </main>
  );
}
