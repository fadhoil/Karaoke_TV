export type StoreMode = 'supabase' | 'demo';

export type Room = {
  code: string;
  name: string;
  now_item_id: string | null;
  is_playing: boolean;
  position_ms: number;
  started_at: string | null;
  updated_at: string;
};

export type QueueItem = {
  id: string;
  room_code: string;
  video_id: string;
  title: string;
  channel: string | null;
  thumbnail: string | null;
  duration_seconds: number | null;
  added_by: string | null;
  status: 'pending' | 'playing' | 'done';
  sort_order: number;
  created_at: string;
};

export type Snapshot = {
  room: Room;
  items: QueueItem[];
  mode: StoreMode;
};

export type AddItemInput = {
  video_id: string;
  title: string;
  channel?: string | null;
  thumbnail?: string | null;
  duration_seconds?: number | null;
  added_by?: string | null;
};

export type PlaybackPatch = Partial<
  Pick<Room, 'now_item_id' | 'is_playing' | 'position_ms' | 'started_at'>
>;

export type SearchResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number | null;
  isKaraoke: boolean;
};
