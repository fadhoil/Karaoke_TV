import type { QueueItem, Room, Snapshot, StoreMode } from '../types';

export type Backend = {
  mode: StoreMode;
  createRoom(name: string): Promise<string>;
  read(code: string): Promise<Snapshot | null>;
  insertItem(item: QueueItem): Promise<void>;
  updateItem(id: string, patch: Partial<QueueItem>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  updateRoom(code: string, patch: Partial<Room>): Promise<void>;
};

export type Watcher = (
  code: string,
  cb: (snapshot: Snapshot | null) => void,
) => () => void;

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(length = 5): string {
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) {
    out += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

export function emptyRoom(code: string, name: string): Room {
  return {
    code,
    name,
    now_item_id: null,
    is_playing: false,
    position_ms: 0,
    started_at: null,
    updated_at: new Date().toISOString(),
  };
}
