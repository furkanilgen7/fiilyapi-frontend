import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SalesKpiStrip } from "./SalesKpiStrip";
import { COLLECTION_PCT_UNKNOWN_REASON } from "./sales-labels";
import type { SalesSummaryResponse } from "@/lib/api/hooks/useSalesSummary";

/**
 * KAPSAM MASKESİ — SY 58 "Tahsil Edilen" kartının yüzde ipucu.
 *
 * 🔴 `CollectionKpi.collection_pct` `Gorunurluk.operasyonel` etiketlidir ve
 * `finance` kapsamlı rolde `null` gelir. `sales` izin matrisinde kapsam taşıyan
 * TEK rol `accounting`tir (`_FIN`) — yani bu kusur LATENT DEĞİL, tahsilat
 * takibini fiilen yapan rolü VURUYOR.
 *
 * Kart o `null`u tek anlamla okuyup *"Sözleşmeye bağlanmış satış tutarı yok —
 * tahsilat oranı hesaplanmaz"* yazıyordu. Aynı kartın ÜST SATIRI tahsil edilen
 * tutarı GERÇEK bir sayı olarak basarken bu cümle yalandır.
 *
 * Kardeş yüzeylerle (`ContractsTable::ProgressCell`,
 * `ContractPaymentSummaryCard`) AYNI kural: gerekçe ancak PAYDA görünür ve
 * `<= 0` iken kanıtlıdır. Burada payda `contracted_amount`tır.
 */

type Collection = SalesSummaryResponse["collection"];

function summary(collection: Partial<Collection>): SalesSummaryResponse {
  return {
    sold: { count: 34, deed_transferred_count: 30, amount: "31420000.00" },
    reserved: { count: 5, expired_count: 1, amount: "4200000.00" },
    available_units: { count: 13, list_price_total: "12600000.00" },
    collection: {
      collected_amount: "24820000.00",
      contracted_amount: "31420000.00",
      collection_pct: "79.00",
      ...collection,
    },
    overdue: { installment_count: 3, amount: "840000.00", late_fee_amount: "4200.00" },
    upcoming_collections: [],
    expired_reservations: [],
    pending_modules: [],
  } as unknown as SalesSummaryResponse;
}

const cell = () => screen.getByTestId("satis-kpi-collection-pct");

describe("SalesKpiStrip tahsilat oranı — maskeli yüzdeye uydurma gerekçe yazmaz", () => {
  it("🔴 satış tutarı GÖRÜNÜR ve pozitifken null oran: 'satış tutarı yok' DEMEZ", () => {
    render(
      <SalesKpiStrip
        summary={summary({ collection_pct: null, contracted_amount: "31420000.00" })}
      />,
    );
    expect(cell()).toHaveTextContent("—");
    expect(cell()).not.toHaveAttribute("title");
    expect(cell().textContent).not.toContain(COLLECTION_PCT_UNKNOWN_REASON);
  });

  it("🔴 satış tutarı da maskeliyken (null) sebep BİLİNEMEZ — gerekçe basılmaz", () => {
    render(<SalesKpiStrip summary={summary({ collection_pct: null, contracted_amount: null })} />);
    expect(cell()).not.toHaveAttribute("title");
  });

  it("🔴 POZİTİF KONTROL — satış tutarı GÖRÜNÜR ve 0 iken gerekçe KANITLIDIR", () => {
    render(
      <SalesKpiStrip summary={summary({ collection_pct: null, contracted_amount: "0.00" })} />,
    );
    expect(cell()).toHaveAttribute("title", COLLECTION_PCT_UNKNOWN_REASON);
  });

  it("🔴 POZİTİF KONTROL — gerçek oran bozulmadan basılır", () => {
    render(<SalesKpiStrip summary={summary({})} />);
    expect(cell()).toHaveTextContent("tahsilat");
    expect(cell()).not.toHaveAttribute("title");
    expect(cell().textContent).not.toContain("—");
  });
});
