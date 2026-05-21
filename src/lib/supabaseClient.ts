import { createClient } from '@supabase/supabase-js';

// Lê as variáveis do ambiente Vite (usando coerção para evitar erro de ImportMeta no tsc)
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
