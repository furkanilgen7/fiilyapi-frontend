import { pendingModuleLabel } from "@/lib/pending-modules";

import { CASH_FLOW_PROJECTION_REASON } from "./cash-flow-statement";

/**
 * NA:143-159 — `3 Aylık Projeksiyon`.
 *
 * 🔴 **K8 — UCU OLMAYAN ÖĞE SİLİNMEZ, GÖRÜNÜR GEREKÇEYLE DEVRE DIŞI BASILIR**
 * (F-TH kanonu). Uç açıklaması bu kartı ADIYLA kapsam dışına koyar: "ileriye
 * dönük tahmin, algoritması mockup'ta YOK, açıklama metinleri serbest metin"
 * (NA:147 `Tahmini giriş: ₺3,8M`, NA:151 `Hakediş + bordro`). Üç satırın
 * sayıları UYDURULMAZ — bir para yüzeyinde tahmin icat etmek kabul edilemez.
 *
 * 🔴 Gerekçe metni yanına SABİTLENMEZ, kartın kendi `disabledReason`
 * anahtarından TÜRER (F-PRJTAB kanonu): uç açıldığında anahtar kaldırılır ve
 * metin kendiliğinden kaybolur.
 */
export function CashProjectionCard() {
  return (
    // 🔴 `aria-disabled` KULLANILMAZ: `<section>`ın örtük rolü `region`dır ve
    // o rol bu özniteliği DESTEKLEMEZ (jsx-a11y uyarısı). Kartta tıklanabilir
    // hiçbir öğe zaten yoktur; "devre dışı"lığı ekran okuyucuya taşıyan şey
    // aşağıdaki GÖRÜNÜR gerekçe metnidir — `title`da saklanan bir ipucu değil.
    <section className="fs-cf-panel fs-cf-panel--disabled" data-testid="na-projection">
      {/* NA:144 */}
      <h2 className="fs-cf-panel__title">3 Aylık Projeksiyon</h2>
      <p className="fs-notice" data-testid="na-projection-reason">
        {pendingModuleLabel(CASH_FLOW_PROJECTION_REASON)}.
      </p>
    </section>
  );
}
