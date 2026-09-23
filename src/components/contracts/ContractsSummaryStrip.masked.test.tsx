import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContractsSummaryStrip } from "./ContractsSummaryStrip";
import type { ContractSummary } from "@/lib/api/hooks/useContracts";

/**
 * KAPSAM MASKESİ — SZL 37 "Toplam Hakediş" KPI kartı.
 *
 * 🔴 Kart `progress_payment_total === null` hâlinde SABİT bir gerekçe
 * yazıyordu: *"Taşeron hakediş toplamı bu görünüme gelmedi"*. Bu cümle artık
 * HER GÖRÜNDÜĞÜNDE yalandır ve bu ÖLÇÜLDÜ, varsayılmadı:
 *
 *   · `contracts/service.py:264` ve `:289` — İŞVEREN ve TAŞERON dallarının
 *     İKİSİ de `_quantize_money(sum(..., Decimal("0")))` döndürür. Boş küme
 *     bile `0.00` üretir; sunucunun `None` döndüreceği bir yol YOKTUR.
 *   · `progress_payment_total` `Gorunurluk.para` etiketlidir (schemas.py:116).
 *
 * Yani yanıtta `null` görülmesinin TEK sebebi maskedir — "bu yüzeye gelmedi"
 * değil "bu tutarı görmeye yetkin yok". Sebep ölçülemediği için hiç yazılmaz
 * (`placeholder-cell.ts` 3. hâli): "—", ipucu VERİLMEZ.
 */

function summary(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    total_amount: "9400000.00",
    active_count: 2,
    progress_payment_total: "110800.00",
    expiring_this_month_count: 0,
    ...overrides,
  } as ContractSummary;
}

describe("ContractsSummaryStrip 'Toplam Hakediş' — maskeli tutara uydurma gerekçe yazmaz", () => {
  it("🔴 maskeli (null) toplam: '—' basar, 'bu görünüme gelmedi' DEMEZ", () => {
    render(<ContractsSummaryStrip summary={summary({ progress_payment_total: null })} />);
    const card = screen.getByTestId("szl-kpi-payment-total");
    expect(card).toHaveTextContent("—");
    expect(card).not.toHaveAttribute("title");
    expect(card.textContent).not.toMatch(/gelmedi|görünüme/);
    // Kart SİLİNMEZ — etiket yerinde kalır.
    expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
  });

  it("🔴 POZİTİF KONTROL — gerçek toplam bozulmadan basılır", () => {
    render(<ContractsSummaryStrip summary={summary()} />);
    const card = screen.getByTestId("szl-kpi-payment-total");
    expect(card).toHaveTextContent("₺ 110,8B");
    expect(card.textContent).not.toContain("—");
  });

  it("🔴 POZİTİF KONTROL — gerçek 0 maskelenmiş DEĞİLDİR, '₺ 0' basılır", () => {
    render(<ContractsSummaryStrip summary={summary({ progress_payment_total: "0.00" })} />);
    expect(screen.getByTestId("szl-kpi-payment-total")).toHaveTextContent("₺ 0");
  });
});
