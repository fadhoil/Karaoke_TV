'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { QueueItem, Room, RoomMember, Snapshot } from '../types';
import {
  emptyRoom,
  makeRoomCode,
  type Backend,
  type PresenceWatcher,
  type Watcher,
} from './backend';
import { createStore } from './core';

function buildClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
}

export function createSupabaseStore(url: string, anonKey: string) {
  const supabase = buildClient(url, anonKey);

  const backend: Backend = {
    mode: 'supabase',

    async createRoom(name) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = makeRoomCode();
        const { error } = await supabase
          .from('rooms')
          .insert({ ...emptyRoom(code, name || 'Karaoke Room') });
        if (!error) return code;
        if (error.code !== '23505') throw new Error(error.message);
      }
      throw new Error('Gagal membuat kode room, coba lagi.');
    },

    async read(code) {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!room) return null;

      const { data: items, error: itemsError } = await supabase
        .from('queue_items')
        .select('*')
        .eq('room_code', code)
        .order('sort_order', { ascending: true });
      if (itemsError) throw new Error(itemsError.message);

      return {
        room: room as Room,
        items: (items ?? []) as QueueItem[],
        mode: 'supabase',
      };
    },

    async insertItem(item) {
      const { error } = await supabase.from('queue_items').insert(item);
      if (error) throw new Error(error.message);
    },

    async updateItem(id, patch) {
      const { error } = await supabase.from('queue_items').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async deleteItem(id) {
      const { error } = await supabase.from('queue_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async deleteRoom(code) {
      const { error: itemsError } = await supabase
        .from('queue_items')
        .delete()
        .eq('room_code', code);
      if (itemsError) throw new Error(itemsError.message);

      const { error } = await supabase.from('rooms').delete().eq('code', code);
      if (error) throw new Error(error.message);
    },

    async updateRoom(code, patch) {
      const { error } = await supabase.from('rooms').update(patch).eq('code', code);
      if (error) throw new Error(error.message);
    },
  };

  const watch: Watcher = (code, cb) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void backend.read(code).then(cb).catch(() => undefined);
      }, 120);
    };

    const channel = supabase
      .channel(`karaoke-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items' }, refresh)
      .subscribe();

    const poll = setInterval(refresh, 5000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  };

  const watchMembers: PresenceWatcher = (code, me, cb) => {
    const ONLINE_WINDOW = 20000;
    const KEEP_WINDOW = 10 * 60 * 1000;
    const seen = new Map<string, { name: string; lastSeen: number }>();

    const channel = supabase.channel(`karaoke-presence-${code}`, {
      config: { presence: { key: me.id } },
    });

    const emit = () => {
      const state = channel.presenceState() as Record<string, Array<{ name?: string }>>;
      const now = Date.now();

      for (const [key, metas] of Object.entries(state)) {
        const name = metas?.[0]?.name ?? 'Tamu';
        seen.set(key, { name, lastSeen: now });
      }

      const list: RoomMember[] = [];
      for (const [id, entry] of seen) {
        const age = now - entry.lastSeen;
        if (age > KEEP_WINDOW) {
          seen.delete(id);
          continue;
        }
        list.push({ id, name: entry.name, online: age < ONLINE_WINDOW, lastSeen: entry.lastSeen });
      }

      list.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
      cb(list);
    };

    channel.on('presence', { event: 'sync' }, emit);

    void channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ name: me.name, joined_at: new Date().toISOString() });
      }
    });

    const sweep = setInterval(emit, 5000);

    return () => {
      clearInterval(sweep);
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  };

  return createStore(backend, watch, watchMembers);
}
