/**
 * Supabase istemcisi — tek örnek (singleton).
 *
 * URL ve anon key ortam değişkenlerinden gelir; kod içinde asla
 * düz metin olarak yazılmaz. .env dosyası .gitignore'dadır.
 *
 * Canlı ve test ortamları ayrı Supabase projeleridir.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Ortam değişkenleri eksikse tarayıcı konsoluna bilgi düşer.
// Uygulama çökmez — misafir oyuncular etkilenmez.
if (!url || !anonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlı değil. ' +
    'Üyelik ve lig özellikleri çalışmaz, misafir oyun devam eder.',
  );
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder');
