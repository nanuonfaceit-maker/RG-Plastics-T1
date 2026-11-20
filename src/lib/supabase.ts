
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
const rawKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY : '';

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabasePublishableKey = typeof rawKey === 'string' ? rawKey.trim() : '';

function initSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
      'Missing or incomplete Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Operating in standalone offline PWA mode.'
    );
    return createClient('https://offline-mock.supabase.co', 'offline-anon-key');
  }

  try {
    return createClient(supabaseUrl, supabasePublishableKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client; falling back to offline mock mode:', err);
    return createClient('https://offline-mock.supabase.co', 'offline-anon-key');
  }
}

export const supabase = initSupabase();
