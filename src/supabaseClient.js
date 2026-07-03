import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Helps catch a missing .env file early instead of silent failures.
  console.error(
    'Missing Supabase env vars. Did you create a .env file from .env.example?'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
