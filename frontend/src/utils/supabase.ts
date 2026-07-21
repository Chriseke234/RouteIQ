import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create the Supabase client. If not configured, we return null.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Optimizer API Endpoint URL for Route IQ solvers
export const OPTIMIZER_API_URL = process.env.NEXT_PUBLIC_OPTIMIZER_API_URL || 'http://localhost:8000';
