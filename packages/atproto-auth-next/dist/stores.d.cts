import { SupabaseClient } from '@supabase/supabase-js';
import { NodeSavedSessionStore, NodeSavedStateStore } from '@atproto/oauth-client-node';

declare function createSupabaseSessionStore(supabase: SupabaseClient, appId: string): NodeSavedSessionStore;

declare function createSupabaseStateStore(supabase: SupabaseClient, appId: string): NodeSavedStateStore;
declare function cleanupExpiredStates(supabase: SupabaseClient): Promise<number>;

export { cleanupExpiredStates, createSupabaseSessionStore, createSupabaseStateStore };
