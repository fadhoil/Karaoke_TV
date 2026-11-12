'use client';

export type SoundName = 'tap' | 'add' | 'success' | 'error' | 'skip' | 'toggle' | 'join';

const PREFS_KEY = 'karaoke.sound.prefs';

type Prefs = { music: boolean; effects: boolean };

let prefs: Prefs = { music: true, effects: true };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicTimer: number | null = null;
let nextNote = 0;
let step = 0;
let musicRunning = false;

export function initAudioPrefs(): Prefs {
  if (typeof window === 'undefined') return prefs;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      prefs = {
        music: parsed.music !== false,
        effects: parsed.effects !== false,
      };
    }
  } catch {
    /* ignore */
  }
  return prefs;
}

function savePrefs() {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type VoiceOptions = {
  type?: OscillatorType;
  peak?: number;
  delay?: number;
  slideTo?: number;
  attack?: number;
};

function voice(freq: number, duration: number, options: VoiceOptions = {}, bus?: GainNode) {
  const ac = ctx;
  const target = bus ?? sfxBus;
  if (!ac || !target) return;

  const start = ac.currentTime + (options.delay ?? 0);
  const attack = options.attack ?? 0.012;
  const peak = options.peak ?? 0.14;

  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = options.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (options.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.slideTo), start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(target);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playSound(name: SoundName = 'tap') {
  if (!prefs.effects) return;
  const ac = ensureAudio();
  if (!ac) return;

  switch (name) {
    case 'tap':
      voice(760, 0.09, { peak: 0.11 });
      voice(1140, 0.06, { peak: 0.045, delay: 0.015 });
      break;
    case 'add':
      voice(523.25, 0.14, { peak: 0.1, type: 'triangle' });
      voice(783.99, 0.2, { peak: 0.09, delay: 0.07, type: 'triangle' });
      break;
    case 'success':
      voice(659.25, 0.14, { peak: 0.09 });
      voice(880, 0.16, { peak: 0.09, delay: 0.075 });
      voice(1174.66, 0.24, { peak: 0.08, delay: 0.15 });
      break;
    case 'join':
      voice(523.25, 0.16, { peak: 0.09 });
      voice(659.25, 0.16, { peak: 0.09, delay: 0.09 });
      voice(783.99, 0.26, { peak: 0.08, delay: 0.18 });
      break;
    case 'error':
      voice(233.08, 0.16, { peak: 0.1, type: 'sawtooth', slideTo: 180 });
      voice(174.61, 0.22, { peak: 0.08, type: 'sawtooth', delay: 0.12 });
      break;
    case 'skip':
      voice(880, 0.1, { peak: 0.09 });
      voice(587.33, 0.14, { peak: 0.08, delay: 0.06 });
      break;
    case 'toggle':
      voice(440, 0.1, { peak: 0.09, type: 'triangle' });
      voice(660, 0.12, { peak: 0.08, delay: 0.05, type: 'triangle' });
      break;
    default:
      break;
  }
}

const VIBRATION: Record<SoundName, number | number[]> = {
  tap: 8,
  add: [12, 26, 12],
  success: [10, 40, 14],
  join: [10, 30, 10, 30, 14],
  error: [45, 40, 45],
  skip: 16,
  toggle: 10,
};

export function vibrateFor(name: SoundName = 'tap') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(VIBRATION[name] ?? 8);
  } catch {
    /* ignore */
  }
}

/* ---------------- Background jingle ---------------- */

const STEP = 0.42;
// Cmaj7 - G - Am7 - Fmaj7, dipilih supaya hangat dan tidak mengganggu.
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 493.88],
  [196.0, 246.94, 293.66, 392.0],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 349.23],
];

function scheduleMusic() {
  const ac = ctx;
  const bus = musicBus;
  if (!ac || !bus) return;

  while (nextNote < ac.currentTime + 1.4) {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const at = nextNote - ac.currentTime;

    if (step % 8 === 0) {
      chord.forEach((freq) => {
        voice(freq / 2, STEP * 8 * 0.98, {
          type: 'triangle',
          peak: 0.03,
          delay: at,
          attack: 0.9,
        }, bus);
      });
    }

    const pluck = chord[step % chord.length] * 2;
    voice(pluck, 0.6, { type: 'sine', peak: 0.045, delay: at }, bus);
    if (step % 8 === 3 || step % 8 === 6) {
      voice(pluck * 1.5, 0.45, { type: 'sine', peak: 0.025, delay: at + STEP / 2 }, bus);
    }

    nextNote += STEP;
    step += 1;
  }
}

export function startMusic() {
  const ac = ensureAudio();
  if (!ac || !musicBus || musicRunning) return;

  musicRunning = true;
  nextNote = ac.currentTime + 0.15;
  musicBus.gain.cancelScheduledValues(ac.currentTime);
  musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), ac.currentTime);
  musicBus.gain.linearRampToValueAtTime(1, ac.currentTime + 1.4);

  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 250);
}

export function stopMusic() {
  if (!musicRunning) return;
  musicRunning = false;

  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }

  const ac = ctx;
  if (ac && musicBus) {
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), ac.currentTime);
    musicBus.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.7);
  }
}

export function getSoundPrefs(): Prefs {
  return prefs;
}

export function isMusicEnabled() {
  return prefs.music;
}

export function isEffectsEnabled() {
  return prefs.effects;
}

export function setMusicEnabled(enabled: boolean) {
  prefs = { ...prefs, music: enabled };
  savePrefs();
  if (enabled) startMusic();
  else stopMusic();
}

export function setEffectsEnabled(enabled: boolean) {
  prefs = { ...prefs, effects: enabled };
  savePrefs();
  if (enabled) playSound('toggle');
}
