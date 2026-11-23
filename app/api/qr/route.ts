import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get('text');
  if (!text) {
    return new Response('Parameter text wajib diisi.', { status: 400 });
  }

  const svg = await QRCode.toString(text.slice(0, 512), {
    type: 'svg',
    margin: 1,
    width: 512,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b0714', light: '#ffffff' },
  });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=3600',
    },
  });
}
