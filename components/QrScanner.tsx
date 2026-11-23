'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onResult: (code: string) => void;
  onClose: () => void;
};

function extractRoomCode(text: string): string | null {
  const fromUrl = text.match(/\/r\/([A-Za-z0-9]{4,8})/);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const clean = text.trim().toUpperCase();
  if (/^[A-Z0-9]{4,8}$/.test(clean)) return clean;
  return null;
}

export default function QrScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onResultRef = useRef(onResult);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState('Arahkan kamera ke QR code di layar TV');

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let lastScan = 0;
    let done = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Browser ini tidak mendukung kamera. Masukkan kode room secara manual.');
        return;
      }

      try {
        const jsQR = (await import('jsqr')).default;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { willReadFrequently: true });
        if (!video || !canvas || !context) return;

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setReady(true);

        const scan = (time: number) => {
          if (cancelled || done) return;

          if (time - lastScan > 130) {
            lastScan = time;

            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
              const scale = Math.min(1, 480 / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);

              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(image.data, image.width, image.height, {
                inversionAttempts: 'dontInvert',
              });

              if (result?.data) {
                const code = extractRoomCode(result.data);
                if (code) {
                  done = true;
                  stream?.getTracks().forEach((track) => track.stop());
                  onResultRef.current(code);
                  return;
                }
                setHint('QR terbaca, tapi bukan room karaoke. Coba QR lain.');
              }
            }
          }

          frame = requestAnimationFrame(scan);
        };

        frame = requestAnimationFrame(scan);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (/denied|notallowed|permission/i.test(message)) {
          setError('Izin kamera ditolak. Izinkan akses kamera di browser, atau ketik kode manual.');
        } else {
          setError('Kamera tidak bisa dibuka. Pastikan halaman memakai HTTPS lalu coba lagi.');
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Pindai QR room">
      <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <button type="button" className="scanner-close" onClick={onClose} aria-label="Tutup kamera">
        ✕
      </button>

      <div className="scanner-shade">
        <div className={`scanner-frame ${ready ? 'is-active' : ''}`}>
          <span className="scanner-line" />
        </div>
        <p className="scanner-hint">{error ?? hint}</p>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Masukkan kode manual
        </button>
      </div>
    </div>
  );
}
