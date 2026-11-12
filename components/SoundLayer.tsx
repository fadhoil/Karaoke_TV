'use client';

import { useEffect, useState } from 'react';
import {
  ensureAudio,
  initAudioPrefs,
  playSound,
  setEffectsEnabled,
  setMusicEnabled,
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
  const [music, setMusic] = useState(true);
  const [effects, setEffects] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = initAudioPrefs();
    setMusic(prefs.music);
    setEffects(prefs.effects);
    setReady(true);
  }, []);

  // Browser baru mengizinkan audio setelah ada interaksi pertama.
  useEffect(() => {
    function unlock() {
      ensureAudio();
      if (initAudioPrefs().music) startMusic();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
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
