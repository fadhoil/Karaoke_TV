import { NextResponse } from 'next/server';
import type { SearchResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KARAOKE_HINTS = [
  'karaoke',
  'minus one',
  'minusone',
  'instrumental',
  'backing track',
  'no vocal',
  'tanpa vokal',
  'lagu karaoke',
  'sing along',
  'sing-along',
  'lirik',
  'lyrics',
  'kar',
];

const REJECT_HINTS = ['reaction', 'tutorial', 'behind the scenes', 'interview', 'podcast', 'vlog'];

function hasHint(text: string, hints: string[]) {
  const lower = text.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function isoDurationToSeconds(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

export async function GET(request: Request) {
  const raw = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (!raw) {
    return NextResponse.json({ error: 'Kata kunci lagu masih kosong.' }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          'Pencarian YouTube belum aktif. Tambahkan YOUTUBE_API_KEY di environment, atau tempel link YouTube langsung.',
        code: 'NO_KEY',
      },
      { status: 503 },
    );
  }

  const alreadyKaraoke = hasHint(raw, KARAOKE_HINTS);
  const query = alreadyKaraoke ? raw : `${raw} karaoke`;

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '25');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('videoSyndicated', 'true');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', key);

  const searchResponse = await fetch(searchUrl, { cache: 'no-store' });
  const searchData = await searchResponse.json();

  if (!searchResponse.ok) {
    const reason = searchData?.error?.errors?.[0]?.reason as string | undefined;
    const message =
      reason === 'quotaExceeded'
        ? 'Kuota YouTube API hari ini habis. Coba lagi besok atau tambahkan lagu lewat link.'
        : (searchData?.error?.message as string | undefined) ?? 'Pencarian YouTube gagal.';
    return NextResponse.json({ error: message, code: reason ?? 'YOUTUBE_ERROR' }, { status: 502 });
  }

  const rawItems = (searchData.items ?? []) as Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }>;

  const ids = rawItems.map((item) => item.id?.videoId).filter(Boolean) as string[];

  const durations: Record<string, number | null> = {};
  if (ids.length > 0) {
    const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailUrl.searchParams.set('part', 'contentDetails');
    detailUrl.searchParams.set('id', ids.join(','));
    detailUrl.searchParams.set('key', key);
    const detailResponse = await fetch(detailUrl, { cache: 'no-store' });
    if (detailResponse.ok) {
      const detailData = await detailResponse.json();
      for (const video of detailData.items ?? []) {
        durations[video.id] = isoDurationToSeconds(video.contentDetails?.duration);
      }
    }
  }

  const results: SearchResult[] = [];
  for (const item of rawItems) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const title = item.snippet?.title ?? 'Tanpa judul';
    const channel = item.snippet?.channelTitle ?? '';
    const durationSeconds = durations[videoId] ?? null;

    if (durationSeconds !== null && (durationSeconds < 45 || durationSeconds > 1200)) continue;
    if (!hasHint(title, KARAOKE_HINTS) && hasHint(title, REJECT_HINTS)) continue;

    results.push({
      videoId,
      title,
      channel,
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds,
      isKaraoke: hasHint(`${title} ${channel}`, KARAOKE_HINTS),
    });
  }

  results.sort((a, b) => Number(b.isKaraoke) - Number(a.isKaraoke));

  return NextResponse.json({ query, results });
}
