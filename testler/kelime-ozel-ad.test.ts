/**
 * kelime-ozel-ad.test.ts — Özel adlar sözlüğe girmemeli.
 *
 * NEDEN BU TEST VAR
 * Sözlük üretim betiği özel adları büyük harfle başlamalarına bakarak
 * eliyor (`kelime-listesi-uret.mjs`). Bu süzgeç çalışıyor ama hiçbir
 * yerde sınanmıyordu: liste yeniden üretilirken süzgeç bozulsa ya da
 * kaynak sözlük biçim değiştirse kimse fark etmezdi. Liste elle
 * düzenlenmediği için de "bir kere bakıp geçmek" yetmiyor.
 *
 * SINIRI NET ÇİZMEK GEREKİYOR
 * Türkçede pek çok özel ad aynı zamanda sıradan bir kelime:
 *
 *   ilhan   hükümdar, hakan      melek   gökten gelen varlık
 *   ordu    silahlı kuvvet       mersin  bir ağaç
 *   batman  eski bir ağırlık ölçüsü      özlem   hasret
 *   ufuk    gökle yerin birleştiği yer   tokat   el darbesi
 *
 * Bunlar sözlükte KALMALI; atmak dili fakirleştirir ve oyunu
 * zorlaştırır. Aynı gerekçe içki süzgecinde de yazılı: "cin", "bar",
 * "rom" eş anlamlıları olduğu için bilerek bırakılmıştı.
 *
 * Bu test o yüzden yalnızca BAŞKA ANLAMI OLMAYAN adları arıyor.
 */

import { describe, it, expect } from 'vitest';
import { KELIME_METNI, YAYGIN_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

const genis = new Set(KELIME_METNI.split('\n'));
const yaygin = new Set(YAYGIN_METNI.split('\n'));

/** Sıradan bir kelime olarak kullanımı olmayan kişi adları. */
const KISI_ADLARI = [
  'ahmet', 'mehmet', 'ayşe', 'fatma', 'hasan', 'hüseyin', 'mustafa',
  'ibrahim', 'ismail', 'yusuf', 'ömer', 'osman', 'emine', 'zeynep',
  'merve', 'burak', 'serkan', 'sinan', 'cengiz', 'ferhat', 'gökhan',
  'halil', 'necati', 'sedat', 'tarık', 'yasin', 'orhan', 'hatice',
  'esra', 'büşra', 'tuğba', 'sibel', 'nurten', 'şenay', 'ceyda',
];

/** Yalnızca yer adı olan maddeler. */
const YER_ADLARI = [
  'istanbul', 'ankara', 'izmir', 'bursa', 'adana', 'konya', 'antalya',
  'trabzon', 'erzurum', 'sivas', 'malatya', 'denizli', 'manisa',
  'balıkesir', 'rize', 'artvin', 'edirne', 'kayseri', 'eskişehir',
  'gaziantep', 'diyarbakır', 'sakarya', 'kocaeli', 'zonguldak',
  'yozgat', 'nevşehir', 'isparta', 'burdur', 'karabük', 'amasya',
  'giresun', 'gümüşhane', 'bayburt', 'erzincan', 'tunceli', 'bingöl',
  'bitlis', 'şırnak', 'siirt', 'mardin', 'adıyaman', 'osmaniye',
  'türkiye', 'almanya', 'fransa', 'ingiltere', 'rusya', 'japonya',
];

describe('sözlükte özel ad yok', () => {
  it('kişi adları hiçbir listede yok', () => {
    const kacak = KISI_ADLARI.filter((a) => genis.has(a) || yaygin.has(a));
    expect(kacak, `özel ad sözlüğe sızmış: ${kacak.join(', ')}`).toEqual([]);
  });

  it('yer adları hiçbir listede yok', () => {
    const kacak = YER_ADLARI.filter((a) => genis.has(a) || yaygin.has(a));
    expect(kacak, `yer adı sözlüğe sızmış: ${kacak.join(', ')}`).toEqual([]);
  });

  it('başka anlamı olan adlar BİLEREK duruyor', () => {
    // Bu satırlar bir güvence değil, bir KARAR kaydı: aşağıdakiler
    // sıradan kelime oldukları için elenmedi. Biri bunları atmaya
    // kalkarsa test kırılır ve gerekçeyi burada okur.
    for (const k of ['ordu', 'ufuk', 'melek', 'özlem', 'tokat', 'mersin']) {
      expect(genis.has(k), `${k} sıradan bir kelime, listede kalmalı`).toBe(true);
    }
  });
});
