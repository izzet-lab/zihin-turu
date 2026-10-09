/**
 * istemci.ts — Supabase istemcisinin TEK tip tanımı.
 *
 * NEDEN VAR
 * Fonksiyonlar istemciyi birbirine parametre olarak geçiyor ve tipi
 * her dosyada `ReturnType<typeof createClient>` diye yazılıyordu. Bu
 * iki soruna yol açtı:
 *
 * 1. `createClient` jeneriksiz yazılınca veritabanı tipi `unknown`
 *    oluyor ve `from('duello_mac')` sonucu `never`a düşüyor. Sonra
 *    `son.kazanan` gibi her alan okuması "Property does not exist on
 *    type 'never'" veriyor.
 * 2. Gerçekte kurulan istemci `SupabaseClient<any, 'public', ...>`
 *    oluyor; `unknown` bekleyen imzaya geçmiyor. "Argument of type
 *    SupabaseClient<any,...> is not assignable to..." hatasının
 *    tamamı buradan.
 *
 * Yirmi altı derleyici hatasının yirmi birini bu iki madde üretiyordu
 * ve tip denetimi bu yüzden açılamıyordu.
 *
 * NEDEN `any`
 * Veritabanı şemasının TypeScript karşılığı üretilmiyor. Üretilseydi
 * sütun adları da denetlenirdi; o ayrı ve büyük bir iş. Şimdilik
 * şema gevşek, ama GERİ KALAN HER ŞEY denetleniyor — eksik import,
 * yanlış imza, null okuması.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Fonksiyonlar arasında gezen Supabase istemcisi. */
// deno-lint-ignore no-explicit-any
export type Istemci = ReturnType<typeof createClient<any>>;
