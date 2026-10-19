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

/*
 * YEDEK ADRES `??` DEĞİL `||` İLE SEÇİLİYOR
 *
 * `??` yalnızca null ve undefined'ı yakalar; BOŞ DİZEYİ yakalamaz.
 * Değişken tanımlı ama değeri boşsa — dağıtım panelinde anahtar
 * açılmış, değeri henüz girilmemişse tam olarak bu olur — Vite
 * derlemeye `""` gömüyor ve `createClient("")` açılışta
 * "supabaseUrl is required" diye fırlatıyor. Bu hata modül
 * yüklenirken olduğu için React hiç başlamıyor: oyuncu BEYAZ EKRAN
 * görüyor, misafir oyun dahil hiçbir şey çalışmıyor.
 *
 * 19 Ekim 2026'da Coolify'a taşınırken tam bu oldu. `||` boş dizeyi
 * de yakalıyor; eksik ya da boş, ikisinde de uygulama açılıyor ve
 * yalnızca üyelik/lig devre dışı kalıyor — amaçlanan davranış buydu.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
);
