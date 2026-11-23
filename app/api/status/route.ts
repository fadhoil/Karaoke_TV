import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Buka /api/status di browser setelah deploy untuk memastikan environment
 * variable sudah benar-benar terbaca oleh server (bukan hanya ada di file).
 */
export function GET() {
  const youtube = process.env.YOUTUBE_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return NextResponse.json(
    {
      youtubeKey: youtube ? `terbaca (${youtube.slice(0, 6)}…, ${youtube.length} karakter)` : 'TIDAK ditemukan',
      supabase: Boolean(supabaseUrl && supabaseKey),
      supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '') : 'TIDAK ditemukan',
      storeMode: supabaseUrl && supabaseKey ? 'supabase' : 'demo',
      catatan:
        'Jika youtubeKey "TIDAK ditemukan": restart dev server atau Redeploy. Jika ada tapi panjangnya aneh, periksa tanda kutip/spasi.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
