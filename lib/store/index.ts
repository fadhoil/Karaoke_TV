'use client';

import type { Store } from './core';
import { demoStore } from './demo';
import { createSupabaseStore } from './supabase';

export type { Store } from './core';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  cached =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createSupabaseStore(SUPABASE_URL, SUPABASE_ANON_KEY)
      : demoStore;
  return cached;
}

export function getStoreMode() {
  return isSupabaseConfigured ? 'supabase' : 'demo';
}
