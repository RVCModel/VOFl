import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 这些值应该从环境变量中获取
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// 创建客户端Supabase客户端（用于客户端组件）
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}