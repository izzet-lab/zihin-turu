/**
 * 13 yaş altı engeli — iki giriş ekranının (e-posta ve isimle) ortak ekranı.
 * Hesap açılamaz ama misafir oyun tamamen açık; bunu nazikçe söyler.
 */

import Ikon from './Ikon';

interface Props {
  onMisafir: () => void;
  onDuzelt: () => void;
}

export default function YasEngeli({ onMisafir, onDuzelt }: Props) {
  return (
    <main className="min-h-dvh zt-kagit zt-metin flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <Ikon ad="pasta" boyut={52} className="mb-4 zt-metin-soluk" />
        <h1 className="text-xl font-black zt-metin mb-3">Yaşın henüz yetmiyor</h1>
        <p className="zt-metin-soluk text-sm mb-2">
          Üye olmak için en az 13 yaşında olman gerekiyor.
        </p>
        <p className="zt-metin-soluk text-sm mb-8">
          Ama oyunu misafir olarak oynamaya devam edebilirsin — bütün turlar açık.
        </p>
        <button
          onClick={onMisafir}
          className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin"
        >
          Misafir olarak oyna
        </button>
        <button
          onClick={onDuzelt}
          className="mt-4 min-h-[44px] w-full text-center text-sm zt-metin-soluk"
        >
          Doğum yılını düzelt
        </button>
      </div>
    </main>
  );
}
