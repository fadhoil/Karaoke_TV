import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isoDurationToSeconds(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

export async function GET(request: Request) {
  const url = (new URL(request.url).searchParams.get('url') ?? '').trim();
  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: 'Link YouTube tidak dikenali. Salin link video lengkap.' },
      { status: 400 },
    );
  }

  let title = 'Video karaoke';
  let channel = '';

  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    { cache: 'no-store' },
  ).catch(() => null);

  if (oembed?.ok) {
    const data = (await oembed.json()) as { title?: string; author_name?: string };
    title = data.title ?? title;
    channel = data.author_name ?? '';
  }

  let durationSeconds: number | null = null;
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const detail = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${key}`,
      { cache: 'no-store' },
    ).catch(() => null);
    if (detail?.ok) {
      const data = await detail.json();
      durationSeconds = isoDurationToSeconds(data.items?.[0]?.contentDetails?.duration);
    }
  }

  return NextResponse.json({
    videoId,
    title,
    channel,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds,
  });
}
