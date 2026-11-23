'use client';

import type { QueueItem, Room, RoomMember, Snapshot } from '../types';
import {
  emptyRoom,
  makeRoomCode,
  type Backend,
  type PresenceWatcher,
  type Watcher,
} from './backend';
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

  async deleteRoom(code) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(keyFor(code));
    channel?.postMessage({ code });
    emit(code);
  },

  async updateRoom(code, patch) {
    const snapshot = demoRead(code);
    if (!snapshot) return;
    snapshot.room = { ...snapshot.room, ...patch } as Room;
    write(snapshot);
  },
};

/* ---------------- Presence lokal (mode demo) ---------------- */

const presenceBus =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('karaoke-presence')
    : null;

type PresenceEntry = { name: string; lastSeen: number };

const ONLINE_WINDOW = 15000;
const KEEP_WINDOW = 10 * 60 * 1000;

const presenceMembers = new Map<string, Map<string, PresenceEntry>>();
const presenceListeners = new Map<string, Set<(members: RoomMember[]) => void>>();

function snapshotMembers(code: string): RoomMember[] {
  const map = presenceMembers.get(code);
  if (!map) return [];
  const now = Date.now();
  const list: RoomMember[] = [];

  for (const [id, entry] of map) {
    const age = now - entry.lastSeen;
    if (age > KEEP_WINDOW) {
      map.delete(id);
      continue;
    }
    list.push({
      id,
      name: entry.name,
      online: age < ONLINE_WINDOW,
      lastSeen: entry.lastSeen,
    });
  }

  list.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  return list;
}

function emitMembers(code: string) {
  const list = snapshotMembers(code);
  presenceListeners.get(code)?.forEach((cb) => cb(list));
}

function touchPresence(code: string, id: string, name: string) {
  const map = presenceMembers.get(code) ?? new Map<string, PresenceEntry>();
  map.set(id, { name, lastSeen: Date.now() });
  presenceMembers.set(code, map);
}

if (typeof window !== 'undefined') {
  presenceBus?.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | { code?: string; id?: string; name?: string; kind?: string }
      | null;
    if (!data?.code || !data.id) return;
    if (data.kind === 'leave') {
      const entry = presenceMembers.get(data.code)?.get(data.id);
      if (entry) entry.lastSeen = Date.now() - ONLINE_WINDOW - 1000;
    } else {
      touchPresence(data.code, data.id, data.name ?? 'Tamu');
    }
    emitMembers(data.code);
  });
}

const demoPresence: PresenceWatcher = (code, me, cb) => {
  touchPresence(code, me.id, me.name);
  const set = presenceListeners.get(code) ?? new Set();
  set.add(cb);
  presenceListeners.set(code, set);
  emitMembers(code);

  const announce = () => {
    touchPresence(code, me.id, me.name);
    presenceBus?.postMessage({ code, id: me.id, name: me.name, kind: 'ping' });
    emitMembers(code);
  };

  announce();
  const ping = window.setInterval(announce, 5000);
  const sweep = window.setInterval(() => emitMembers(code), 5000);

  return () => {
    window.clearInterval(ping);
    window.clearInterval(sweep);
    set.delete(cb);
    if (set.size === 0) presenceListeners.delete(code);
    const entry = presenceMembers.get(code)?.get(me.id);
    if (entry) entry.lastSeen = Date.now() - ONLINE_WINDOW - 1000;
    presenceBus?.postMessage({ code, id: me.id, kind: 'leave' });
    emitMembers(code);
  };
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

export const demoStore = createStore(demoBackend, demoWatch, demoPresence);
