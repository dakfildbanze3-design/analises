import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: any = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn('Supabase credentials missing (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY). Storage features will be disabled.');
  }
} catch (err) {
  console.error('Failed to initialize Supabase:', err);
}

export const supabase = supabaseInstance;
