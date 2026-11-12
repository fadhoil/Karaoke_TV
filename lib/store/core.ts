import type { Snapshot } from '../types';
import type { Backend, Watcher } from './backend';

export type Store = {
  mode: Backend['mode'];
  createRoom(name: string): Promise<string>;
  getRoom(code: string): Promise<Snapshot | null>;
  subscribe(code: string, cb: (snapshot: Snapshot) => void): () => void;
  addItem(code: string, input: {
    video_id: string;
    title: string;
    channel?: string | null;
    thumbnail?: string | null;
    duration_seconds?: number | null;
    added_by?: string | null;
  }): Promise<void>;
  removeItem(code: string, id: string): Promise<void>;
  moveItem(code: string, id: string, direction: -1 | 1): Promise<void>;
  setPlayback(code: string, patch: {
    now_item_id?: string | null;
    is_playing?: boolean;
    position_ms?: number;
    started_at?: string | null;
  }): Promise<void>;
  next(code: string): Promise<void>;
  clearPending(code: string): Promise<void>;
};

function nowIso() {
  return new Date().toISOString();
}

export function createStore(backend: Backend, watch: Watcher): Store {
  async function nextTrack(code: string) {
    const snapshot = await backend.read(code);
    if (!snapshot) return;

    const current = snapshot.items.find((item) => item.id === snapshot.room.now_item_id) ?? null;
    const upcoming = snapshot.items
      .filter((item) => item.id !== snapshot.room.now_item_id && item.status !== 'done')
      .sort((a, b) => a.sort_order - b.sort_order);
    const upNext = upcoming[0] ?? null;

    if (current) await backend.updateItem(current.id, { status: 'done' });
    if (upNext) await backend.updateItem(upNext.id, { status: 'playing' });
    await backend.updateRoom(code, {
      now_item_id: upNext?.id ?? null,
      is_playing: Boolean(upNext),
      position_ms: 0,
      started_at: nowIso(),
      updated_at: nowIso(),
    });
  }

  return {
    mode: backend.mode,
    createRoom: (name) => backend.createRoom(name),
    getRoom: (code) => backend.read(code),

    subscribe(code, cb) {
      const stop = watch(code, (snapshot) => {
        if (snapshot) cb(snapshot);
      });
      void backend.read(code).then((snapshot) => {
        if (snapshot) cb(snapshot);
      });
      return stop;
    },

    async addItem(code, input) {
      const snapshot = await backend.read(code);
      if (!snapshot) return;
      const maxOrder = snapshot.items.reduce((max, item) => Math.max(max, item.sort_order), 0);
      const item = {
        id: crypto.randomUUID(),
        room_code: code,
        video_id: input.video_id,
        title: input.title,
        channel: input.channel ?? null,
        thumbnail: input.thumbnail ?? null,
        duration_seconds: input.duration_seconds ?? null,
        added_by: input.added_by ?? null,
        status: 'pending' as const,
        sort_order: maxOrder + 100,
        created_at: nowIso(),
      };
      await backend.insertItem(item);

      // Antrian yang tadinya kosong langsung diputar supaya TV tidak diam.
      if (!snapshot.room.now_item_id) {
        await backend.updateItem(item.id, { status: 'playing' });
        await backend.updateRoom(code, {
          now_item_id: item.id,
          is_playing: true,
          position_ms: 0,
          started_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    },

    async removeItem(code, id) {
      const snapshot = await backend.read(code);
      if (!snapshot) return;
      await backend.deleteItem(id);
      if (snapshot.room.now_item_id === id) {
        await nextTrack(code);
      }
    },

    async moveItem(code, id, direction) {
      const snapshot = await backend.read(code);
      if (!snapshot) return;
      const ordered = [...snapshot.items].sort((a, b) => a.sort_order - b.sort_order);
      const index = ordered.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ordered.length) return;

      const a = ordered[index];
      const b = ordered[target];
      const aOrder = a.sort_order;
      const bOrder = b.sort_order;
      await backend.updateItem(a.id, { sort_order: bOrder });
      await backend.updateItem(b.id, { sort_order: aOrder });
    },

    async setPlayback(code, patch) {
      await backend.updateRoom(code, { ...patch, updated_at: nowIso() });
    },

    next: nextTrack,

    async clearPending(code) {
      const snapshot = await backend.read(code);
      if (!snapshot) return;
      const pending = snapshot.items.filter(
        (item) => item.id !== snapshot.room.now_item_id && item.status !== 'playing',
      );
      for (const item of pending) {
        await backend.deleteItem(item.id);
      }
    },
  };
}
