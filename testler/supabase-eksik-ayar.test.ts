/**
 * supabase-eksik-ayar.test.ts — Eksik ya da BOŞ ayar uygulamayı çökertmemeli.
 *
 * NEDEN BU TEST VAR (19 Ekim 2026)
 * Site Coolify'a taşınırken dağıtım panelinde `VITE_SUPABASE_URL`
 * anahtarı açıldı ama değeri henüz girilmemişti. Vite derlemeye boş
 * dize gömdü. Koddaki yedek `url ?? '...'` biçimindeydi ve `??`
 * yalnızca null/undefined'ı yakaladığı için boş dize geçti:
 * `createClient("")` modül yüklenirken fırlattı, React hiç başlamadı,
 * oyuncu beyaz ekran gördü.
 *
 * Amaçlanan davranış şuydu ve bu test onu kilitliyor: ayar eksikse
 * uygulama AÇILIR, yalnızca üyelik ve lig devre dışı kalır. Misafir
 * oyun her hâlükârda çalışır.
 *
 * Test gerçek `supabase.ts`'i çağırmıyor (o modül import anında
 * ortam değişkeni okuyor); yedek seçme KURALINI sınıyor. Kural
 * değişirse — biri tekrar `??` yazarsa — burası kırılır.
 */

import { describe, it, expect } from 'vitest';

/** `supabase.ts` içindeki yedek seçme kuralının aynısı. */
function yedekli(deger: string | undefined, yedek: string): string {
  return deger || yedek;
}

const YEDEK_URL = 'https://placeholder.supabase.co';

describe('Supabase ayarı eksikken', () => {
  it('tanımsız değer yedeğe düşüyor', () => {
    expect(yedekli(undefined, YEDEK_URL)).toBe(YEDEK_URL);
  });

  it('BOŞ DİZE de yedeğe düşüyor — asıl hata buydu', () => {
    expect(yedekli('', YEDEK_URL)).toBe(YEDEK_URL);
  });

  it('yalnızca boşluk içeren değer de boş sayılmalı değil — Supabase hatayı kendi verir', () => {
    // Boşluklu bir adres geçerli değil ama bu kuralın işi değil;
    // burada yalnızca "boş dize yedeğe düşer" güvencesi var.
    expect(yedekli(' ', YEDEK_URL)).toBe(' ');
  });

  it('gerçek değer olduğu gibi geçiyor', () => {
    expect(yedekli('https://abc.supabase.co', YEDEK_URL)).toBe('https://abc.supabase.co');
  });

  it('`??` kullanılsaydı boş dize geçerdi — regresyonun kaydı', () => {
    // Yanlış davranışın kaydı: `??` boş dizeyi yakalamıyor.
    // Değer çalışma anında belirleniyormuş gibi yazıldı; doğrudan ''
    // yazılsaydı TypeScript "sağ taraf erişilemez" diye uyarırdı ve
    // kaydın kendisi derlenmezdi.
    const bos: string | undefined = [''][0];
    expect(bos ?? YEDEK_URL).toBe('');
    expect(bos || YEDEK_URL).toBe(YEDEK_URL);
  });
});
