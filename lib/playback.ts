import type { Room } from './types';

/**
 * Posisi lagu saat ini (ms). `started_at` + `position_ms` adalah titik acuan,
 * jadi setiap perangkat bisa menghitung sendiri tanpa polling terus-menerus.
 */
export function currentPositionMs(room: Room): number {
  const base = Number(room.position_ms ?? 0);
  if (!room.is_playing || !room.started_at) return base;
  const startedAt = new Date(room.started_at).getTime();
  if (Number.isNaN(startedAt)) return base;
  return base + Math.max(0, Date.now() - startedAt);
}

export function formatTime(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds < 0) return '--:--';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function relativePosition(room: Room): number {
  return currentPositionMs(room) / 1000;
}
