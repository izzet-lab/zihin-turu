/**
 * Giriş kapısı — yönetim panelinde seçilen giriş sistemini açar.
 *
 *   sistem1 → Giris (e-posta + parola + Google)
 *   sistem2 → IsimleGiris (yalnızca isim); "hesabın var mı?" ile Giris'e geçilir
 *
 * Seçim `ayar.giris_sistemi`nden okunur. Okunana kadar boş kâğıt gösterilir:
 * önce bir ekranı gösterip sonra ötekine atlamak, oyuncunun yazmaya
 * başladığı formu elinden alırdı.
 */

import { useEffect, useState } from 'react';
import Giris from './Giris';
import IsimleGiris from './IsimleGiris';
import { girisSistemiOku, type GirisSistemi } from '../kimlik';

interface Props {
  onAtla: () => void;
}

export default function GirisKapisi({ onAtla }: Props) {
  const [sistem, setSistem] = useState<GirisSistemi | null>(null);
  // Sistem 2'de oyuncu "hesabın var mı?" dediyse e-posta ekranı.
  const [eposta, setEposta] = useState(false);

  useEffect(() => {
    let iptal = false;
    girisSistemiOku().then((s) => { if (!iptal) setSistem(s); });
    return () => { iptal = true; };
  }, []);

  if (!sistem) return <main className="min-h-dvh zt-kagit" aria-busy="true" />;

  if (sistem === 'sistem1') return <Giris onAtla={onAtla} />;
  if (eposta) return <Giris onAtla={onAtla} onIsimleGiris={() => setEposta(false)} />;
  return <IsimleGiris onAtla={onAtla} onEpostaIleGiris={() => setEposta(true)} />;
}
