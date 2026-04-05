import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 클라이언트용 (브라우저에서 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서버용 (API Route, Server Action에서만 사용 — RLS 우회)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
