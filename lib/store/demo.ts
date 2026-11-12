'use client';

import type { QueueItem, Room, Snapshot } from '../types';
import { emptyRoom, makeRoomCode, type Backend, type Watcher } from './backend';
import { createStore } from './core';

const KEY_PREFIX = 'karaoke.demo.';
const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('karaoke-demo')
    : null;
const listeners = new Map<string, Set<(snapshot: Snapshot | null) => void>>();

function keyFor(code: string) {
  return `${KEY_PREFIX}${code}`;
}

export function demoRead(code: string): Snapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(code));
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function emit(code: string) {
  const snapshot = demoRead(code);
  listeners.get(code)?.forEach((cb) => cb(snapshot));
}

function write(snapshot: Snapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(keyFor(snapshot.room.code), JSON.stringify(snapshot));
  channel?.postMessage({ code: snapshot.room.code });
  emit(snapshot.room.code);
}

function putItem(snapshot: Snapshot, item: QueueItem) {
  const items = snapshot.items.filter((existing) => existing.id !== item.id);
  items.push(item);
  items.sort((a, b) => a.sort_order - b.sort_order);
  snapshot.items = items;
}

if (typeof window !== 'undefined') {
  channel?.addEventListener('message', (event: MessageEvent) => {
    const code = (event.data as { code?: string } | null)?.code;
    if (code) emit(code);
  });
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(KEY_PREFIX)) {
      emit(event.key.slice(KEY_PREFIX.length));
    }
  });
}

const demoBackend: Backend = {
  mode: 'demo',

  async createRoom(name) {
    let code = makeRoomCode();
    while (demoRead(code)) code = makeRoomCode();
    write({ room: emptyRoom(code, name || 'Karaoke Room'), items: [], mode: 'demo' });
    return code;
  },

  async read(code) {
    const snapshot = demoRead(code);
    if (!snapshot) return null;
    snapshot.items.sort((a, b) => a.sort_order - b.sort_order);
    return snapshot;
  },

  async insertItem(item) {
    const snapshot = demoRead(item.room_code);
    if (!snapshot) return;
    putItem(snapshot, item);
    write(snapshot);
  },

  async updateItem(id, patch) {
    if (typeof window === 'undefined') return;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const snapshot = demoRead(key.slice(KEY_PREFIX.length));
      if (!snapshot) continue;
      const index = snapshot.items.findIndex((item) => item.id === id);
      if (index < 0) continue;
      snapshot.items[index] = { ...snapshot.items[index], ...patch };
      write(snapshot);
      return;
    }
  },

  async deleteItem(id) {
    if (typeof window === 'undefined') return;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const snapshot = demoRead(key.slice(KEY_PREFIX.length));
      if (!snapshot) continue;
      if (!snapshot.items.some((item) => item.id === id)) continue;
      snapshot.items = snapshot.items.filter((item) => item.id !== id);
      write(snapshot);
      return;
    }
  },

  async updateRoom(code, patch) {
    const snapshot = demoRead(code);
    if (!snapshot) return;
    snapshot.room = { ...snapshot.room, ...patch } as Room;
    write(snapshot);
  },
};

const demoWatch: Watcher = (code, cb) => {
  const set = listeners.get(code) ?? new Set();
  set.add(cb);
  listeners.set(code, set);
  return () => {
    set.delete(cb);
    if (set.size === 0) listeners.delete(code);
  };
};

export const demoStore = createStore(demoBackend, demoWatch);
