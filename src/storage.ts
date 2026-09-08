import { createClient } from '@supabase/supabase-js';
import { initialState } from './data';
import type { AppState } from './types';

export type SaveResult = { ok: true; state: AppState } | { ok: false; latest: AppState };

export interface StorageAdapter {
  load(): Promise<AppState>;
  save(next: AppState): Promise<SaveResult>;
}

const LOCAL_KEY = 'pentapena_state_v1';

class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppState> {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return initialState();
      const value = JSON.parse(raw) as AppState;
      if (value.version !== 1) return initialState();
      return { ...initialState(), ...value, deferredPayer: value.deferredPayer ?? null, revision: value.revision ?? 0 };
    } catch {
      return initialState();
    }
  }
  async save(next: AppState): Promise<SaveResult> {
    const stamped: AppState = { ...next, revision: next.revision + 1, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(stamped));
    } catch {
      // private browsing mode: state simply won't persist across reloads
    }
    return { ok: true, state: stamped };
  }
}

const ROW_ID = 'main';
type Row = { id: string; revision: number; data: Omit<AppState, 'revision' | 'updatedAt'>; updated_at: string };
const fromRow = (row: Row): AppState => ({ ...row.data, revision: row.revision, updatedAt: row.updated_at });

class SupabaseStorageAdapter implements StorageAdapter {
  private client;
  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }
  async load(): Promise<AppState> {
    const { data, error } = await this.client.from('app_state').select('id,revision,data,updated_at').eq('id', ROW_ID).maybeSingle();
    if (error) throw error;
    if (!data) {
      const seed = initialState();
      const { data: inserted, error: insertError } = await this.client
        .from('app_state')
        .insert({ id: ROW_ID, revision: 0, data: seed })
        .select('id,revision,data,updated_at')
        .single();
      if (insertError) throw insertError;
      return fromRow(inserted as Row);
    }
    return fromRow(data as Row);
  }
  async save(next: AppState): Promise<SaveResult> {
    const { revision, updatedAt, ...rest } = next;
    void updatedAt;
    const { data, error } = await this.client
      .from('app_state')
      .update({ data: rest, revision: revision + 1, updated_at: new Date().toISOString() })
      .eq('id', ROW_ID)
      .eq('revision', revision)
      .select('id,revision,data,updated_at');
    if (error) throw error;
    if (data && data.length) return { ok: true, state: fromRow(data[0] as Row) };
    // revision mismatch: someone else saved first. Surface the authoritative state instead.
    return { ok: false, latest: await this.load() };
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const storage: StorageAdapter =
  SUPABASE_URL && SUPABASE_ANON_KEY ? new SupabaseStorageAdapter(SUPABASE_URL, SUPABASE_ANON_KEY) : new LocalStorageAdapter();
