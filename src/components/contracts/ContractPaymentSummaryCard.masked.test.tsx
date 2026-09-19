import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContractPaymentSummaryCard, CONTRACT_PAYMENT_PCT_PENDING_REASON } from "./ContractPaymentSummaryCard";
import type { ProgressPaymentSummary } from "@/lib/api/hooks/useProgressPayments";

/**
 * KAPSAM MASKESİ — E14 131-132 "Hakediş Özeti" ilerleme satırı.
 *
 * `ProgressPaymentSummary` KENDİ ucunda maskelenmez (o modül kısıtlı değil)
 * AMA `EmployerContractDetail.progress_payment_summary` olarak E14 detayına
 * GÖMÜLÜdür ve `maskele()` iç içe şemalara İNER (backend şema docstring'i bunu
 * adıyla yazar). Yani `finance` kapsamlı rolde `progress_pct` burada da
 * `null`dır.
 *
 * 🔴 Kart o `null`u tek anlamla okuyup *"Sözleşme bedeli girilmeden hakediş
 * yüzdesi hesaplanamaz"* yazıyordu. Bedel HEMEN ÜSTTEKİ satırda görünürken bu
 * cümle YALANDIR. Kardeş yüzey `ContractsTable::ProgressCell` ile AYNI kural:
 * gerekçe ancak `contract_amount` GÖRÜNÜR ve `<= 0` iken kanıtlıdır.
 */

function summary(overrides: Partial<ProgressPaymentSummary> = {}): ProgressPaymentSummary {
  return {
    contract_amount: "1000000.00",
    cumulative_gross: "750000.00",
    progress_pct: "75.00",
    advance_deduction_total: "0.00",
    retention_total: "37500.00",
    net_total: "712500.00",
    payment_count: 3,
    pending_count: 1,
    remaining: "250000.00",
    ...overrides,
  } as ProgressPaymentSummary;
}

function renderCard(overrides: Partial<ProgressPaymentSummary> = {}) {
  return render(<ContractPaymentSummaryCard summary={summary(overrides)} retainagePct="5.00" />);
}

describe("ContractPaymentSummaryCard — maskeli yüzdeye uydurma gerekçe yazmaz", () => {
  it("🔴 bedel GÖRÜNÜR ve pozitifken null yüzde: '—' basar, 'bedel girilmeden' DEMEZ", () => {
    renderCard({ progress_pct: null, contract_amount: "1000000.00" });
    const caption = screen.getByTestId("ecd-pps-pct-pending");
    expect(caption).toHaveTextContent("—");
    expect(caption.textContent).not.toContain(CONTRACT_PAYMENT_PCT_PENDING_REASON);
    expect(screen.queryByTestId("ecd-pps-bar")).toBeNull();
  });

  it("🔴 bedel de maskeliyken (null) sebep BİLİNEMEZ — gerekçe basılmaz", () => {
    renderCard({ progress_pct: null, contract_amount: null });
    const caption = screen.getByTestId("ecd-pps-pct-pending");
    expect(caption.textContent).not.toContain(CONTRACT_PAYMENT_PCT_PENDING_REASON);
  });

  it("🔴 POZİTİF KONTROL — bedel GÖRÜNÜR ve 0 iken gerekçe KANITLIDIR, basılır", () => {
    renderCard({ progress_pct: null, contract_amount: "0.00" });
    expect(screen.getByTestId("ecd-pps-pct-pending")).toHaveTextContent(
      CONTRACT_PAYMENT_PCT_PENDING_REASON,
    );
  });

  it("🔴 POZİTİF KONTROL — gerçek yüzde çubuğu ve '%75 hakkedildi' bozulmaz", () => {
    renderCard();
    expect(screen.getByTestId("ecd-pps-bar")).toBeTruthy();
    expect(screen.getByTestId("ecd-pps-caption")).toHaveTextContent("hakkedildi");
    expect(screen.queryByTestId("ecd-pps-pct-pending")).toBeNull();
  });
});

describe("kesinti kutulari maskeli deger alir (openapi devri 2026-09-19)", () => {
  it("🔴 maskeli kesinti '- —' DEGIL, yalniz '—' basar", () => {
    // `ProgressPaymentSummary`nin para alanlari artik kapsam maskesiyle `null`
    // gelebilir (P6 etiketlemesi). Kutu degeri HER ZAMAN eksi isaretiyle
    // basiliyordu; maskeli halde "- —" gibi anlamsiz bir metin uretirdi.
    // Eksi isareti bir KESINTI isaretidir; gizlenmis bir sayinin YONU YOKTUR.
    renderCard({ advance_deduction_total: null });

    const kutu = screen.getByTestId("ecd-pps-advance");
    expect(kutu.textContent?.trim()).toBe("—");
  });

  it("🔴 POZITIF KONTROL — maskesiz kesinti eksi isaretiyle basilmaya devam eder", () => {
    renderCard({ advance_deduction_total: "1500.00" });

    const kutu = screen.getByTestId("ecd-pps-advance");
    expect(kutu.textContent).toContain("-");
    expect(kutu.textContent?.trim()).not.toBe("—");
  });
});
