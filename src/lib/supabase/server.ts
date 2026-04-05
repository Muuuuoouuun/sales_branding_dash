import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
  hasSupabaseAdminConfig,
} from './config';

export function createSupabaseServerClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.anonKey);
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const config = getSupabasePublicConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!config || !serviceRoleKey) {
    return null;
  }

  return createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasSupabaseServerConfig(): boolean {
  return createSupabaseAdminClient() !== null;
}
