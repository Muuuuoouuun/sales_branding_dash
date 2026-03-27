import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from './config';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  browserClient = createClient(config.url, config.anonKey);
  return browserClient;
}
