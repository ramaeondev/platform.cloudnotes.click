export const SUPABASE_URL = "https://gyyhnbzekafnvxflhlni.supabase.co";
export const VITE_SUPABASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL 
  ? import.meta.env.VITE_SUPABASE_URL 
  : SUPABASE_URL;