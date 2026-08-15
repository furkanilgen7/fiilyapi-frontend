import { CheckIcon, inlineSymbolProps } from "@/components/ui/icons";

import {
  bossApprovalStepLabel,
  estimatePurchaseApproval,
  purchaseApprovalMessage,
} from "./purchase-request-approval";
import type { PurchaseRequestLineValues } from "./purchase-request-form-state";

interface PurchaseRequestApprovalBoxProps {
  lines: readonly PurchaseRequestLineValues[];
}

/**
 * "Onay Akışı" kutusu (FST 156-168).
 *
 * ⚠️ **İSTEMCİ TÜREVİDİR** (spec §1): sunucudan gelen bir alan değildir, yalnız
 * bilgilendiricidir. Hesabın tamamı `purchase-request-approval.ts`teki SAF
 * fonksiyondadır ve birim testlidir; bu bileşen yalnız onu basar.
 *
 * 🔴 Eşik metni (165 rozeti ve 166 sonucu) **TEK KAYNAKTAN** türer
 * (`PURCHASE_APPROVAL_THRESHOLD`) — iki yere "₺500K" yazmak yasaktır (spec K6).
 *
 * ⚠️ approve/reject BU DİLİMDE BASILMAZ (spec K6): onay/red ekranı ayrı bir
 * dilimdir ("Onay Kutusu"). Buradaki adımlar YALNIZ zinciri gösterir, düğme
 * değildir.
 */
export function PurchaseRequestApprovalBox({ lines }: PurchaseRequestApprovalBoxProps) {
  const estimate = estimatePurchaseApproval(lines);

  return (
    <section className="saf-approval" data-testid="talep-onay-akisi">
      {/* 157 */}
      <h2 className="saf-approval__title">Onay Akışı</h2>
      <div className="saf-approval__chain">
        {/* 159 — talebi açan HER ZAMAN aktör; adım tamamlanmış sayılır */}
        <span className="saf-step saf-step--done" data-testid="talep-onay-adim-tamam">
          <CheckIcon {...inlineSymbolProps} /> Talep Eden (Siz)
        </span>
        <span className="saf-step__arrow" aria-hidden="true">
          →
        </span>
        {/* 161 */}
        <span className="saf-step saf-step--next">Proje Müdürü</span>
        <span className="saf-step__arrow" aria-hidden="true">
          →
        </span>
        {/* 163 */}
        <span className="saf-step">Satınalma</span>
        <span className="saf-step__arrow" aria-hidden="true">
          →
        </span>
        {/* 165 — etiket EŞİKTEN türetilir */}
        <span
          className={`saf-step${estimate.outcome === "not_required" ? "" : " saf-step--next"}`}
          data-testid="talep-patron-adimi"
        >
          {bossApprovalStepLabel()}
        </span>
        {/* 166 — hüküm; `unknown` dalında "gerekmiyor" YAZILMAZ (fail-closed) */}
        <span
          className={`saf-approval__result saf-approval__result--${estimate.outcome}`}
          data-testid="talep-onay-sonuc"
        >
          {purchaseApprovalMessage(estimate)}
        </span>
      </div>
    </section>
  );
}
