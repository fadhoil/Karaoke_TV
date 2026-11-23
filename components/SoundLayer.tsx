'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ensureAudio,
  initAudioPrefs,
  nudgeMusic,
  playSound,
  setEffectsEnabled,
  setMusicEnabled,
  setMusicSuppressed,
  startMusic,
  stopMusic,
  vibrateFor,
  type SoundName,
} from '@/lib/audio';

const SOUND_NAMES: SoundName[] = ['tap', 'add', 'success', 'error', 'skip', 'toggle', 'join'];

function isSoundName(value: string | undefined): value is SoundName {
  return Boolean(value) && SOUND_NAMES.includes(value as SoundName);
}

export default function SoundLayer() {
  const pathname = usePathname();
  const inRoom = Boolean(pathname && (pathname.startsWith('/host') || pathname.startsWith('/r/')));
  const [music, setMusic] = useState(true);
  const [effects, setEffects] = useState(true);
  const [ready, setReady] = useState(false);

  // Jingle hanya berbunyi di halaman di luar room.
  useEffect(() => {
    setMusicSuppressed(inRoom);
    if (!inRoom && initAudioPrefs().music) startMusic();
  }, [inRoom]);

  useEffect(() => {
    const prefs = initAudioPrefs();
    setMusic(prefs.music);
    setEffects(prefs.effects);
    setReady(true);
  }, []);

  // Browser baru mengizinkan audio setelah ada interaksi. Dengarkan terus (bukan sekali)
  // supaya jingle tetap hidup walau audio sempat di-suspend browser.
  useEffect(() => {
    function unlock() {
      ensureAudio();
      if (initAudioPrefs().music) {
        startMusic();
        nudgeMusic();
      }
    }

    function wake() {
      if (document.hidden) return;
      if (initAudioPrefs().music) nudgeMusic();
    }

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    document.addEventListener('visibilitychange', wake);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('focus', wake);
      window.removeEventListener('pageshow', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, []);

  // Satu penanganan global: semua tombol/link berbunyi dan bergetar.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const element = target.closest<HTMLElement>('button, a, summary, [role="button"]');
      if (!element) return;
      if (element instanceof HTMLButtonElement && element.disabled) return;
      if (element.dataset.sound === 'none') return;

      const name: SoundName = isSoundName(element.dataset.sound) ? element.dataset.sound : 'tap';
      playSound(name);
      vibrateFor(name);

      // Animasi "hidup" di titik klik untuk semua tombol.
      const animatable = element.closest<HTMLElement>(
        'button, .btn, summary, .icon-btn, .control-btn, [role="button"], [role="switch"]',
      );
      if (animatable) {
        const rect = animatable.getBoundingClientRect();
        animatable.style.setProperty('--tap-x', `${event.clientX - rect.left}px`);
        animatable.style.setProperty('--tap-y', `${event.clientY - rect.top}px`);
        animatable.classList.remove('is-tapped');
        void animatable.offsetWidth;
        animatable.classList.add('is-tapped');
        window.setTimeout(() => animatable.classList.remove('is-tapped'), 560);
      }
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (!ready) return;
      if (document.hidden) stopMusic();
      else if (initAudioPrefs().music) startMusic();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [ready]);

  function toggleMusic() {
    const next = !music;
    setMusic(next);
    setMusicEnabled(next);
    if (next) playSound('success');
  }

  function toggleEffects() {
    const next = !effects;
    setEffects(next);
    setEffectsEnabled(next);
  }

  return (
    <div className="sound-dock" aria-label="Pengaturan suara">
      {inRoom ? null : (
        <button
          type="button"
          className={`sound-btn ${music ? 'is-on' : 'is-off'}`}
          onClick={toggleMusic}
          aria-pressed={music}
          aria-label={music ? 'Matikan musik latar' : 'Nyalakan musik latar'}
          title={music ? 'Musik latar aktif' : 'Musik latar mati'}
        >
          {music ? '🎵' : '🔇'}
        </button>
      )}
      <button
        type="button"
        className={`sound-btn ${effects ? 'is-on' : 'is-off'}`}
        onClick={toggleEffects}
        aria-pressed={effects}
        aria-label={effects ? 'Matikan efek suara' : 'Nyalakan efek suara'}
        title={effects ? 'Efek suara & getar aktif' : 'Efek suara mati'}
      >
        {effects ? '🔔' : '🔕'}
      </button>
    </div>
  );
}
