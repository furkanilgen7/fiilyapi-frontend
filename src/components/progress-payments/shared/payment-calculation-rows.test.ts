import { describe, it, expect } from "vitest";

import { buildPaymentCalculationRows } from "./payment-calculation-rows";

// no 429 · ÖLÇÜLDÜ: bu dosya bekçisizdi — beş satırın SIRASI, etiket kalıbı
// ve `+`/`-` işaret yönü hiçbir birim testle kilitlenmemişti. Hem İşveren
// (PaymentCalculationCard) hem Taşeron (SubcontractorProgressPaymentForm)
// ekranlarının PARA tutarlarını besleyen TEK ortak üreticiyi doğrudan
// hedefler.
const AMOUNTS = {
  gross: "1000000.00",
  vat: "200000.00",
  advance_deduction: "150000.00",
  retention: "50000.00",
  net: "1000000.00",
};

const PERCENTS = {
  vat_pct: "20.00",
  advance_pct: "15.00",
  retainage_pct: "5.00",
};

const LABELS = {
  grossLabel: "Brüt Hakediş",
  netLabel: "Net Tahsil",
};

describe("buildPaymentCalculationRows", () => {
  it("beş satırı SABİT SIRAYLA döner: Brüt/KDV/Avans/Teminat/Net", () => {
    const rows = buildPaymentCalculationRows(AMOUNTS, PERCENTS, LABELS);
    expect(rows.map((row) => row.key)).toEqual(["gross", "vat", "advance", "retention", "net"]);
  });

  it("etiket kalıbı yüzdeyi PARANTEZ İÇİNDE taşır", () => {
    const rows = buildPaymentCalculationRows(AMOUNTS, PERCENTS, LABELS);
    expect(rows.find((row) => row.key === "vat")?.label).toBe("KDV (%20)");
    expect(rows.find((row) => row.key === "advance")?.label).toBe("Avans Kesintisi (%15)");
    expect(rows.find((row) => row.key === "retention")?.label).toBe("Teminat Kesintisi (%5)");
  });

  it("KDV satırı `+` öneki ve `positive` ton taşır (kesinti DEĞİL, ekleme)", () => {
    const vatRow = buildPaymentCalculationRows(AMOUNTS, PERCENTS, LABELS).find(
      (row) => row.key === "vat",
    );
    expect(vatRow?.value.startsWith("+")).toBe(true);
    expect(vatRow?.tone).toBe("positive");
  });

  it("Avans ve Teminat satırları `-` öneki ve `negative` ton taşır (kesinti)", () => {
    const rows = buildPaymentCalculationRows(AMOUNTS, PERCENTS, LABELS);
    const advance = rows.find((row) => row.key === "advance");
    const retention = rows.find((row) => row.key === "retention");

    expect(advance?.value.startsWith("-")).toBe(true);
    expect(advance?.tone).toBe("negative");
    expect(retention?.value.startsWith("-")).toBe(true);
    expect(retention?.tone).toBe("negative");
  });

  it("Brüt ve Net satırları TON TAŞIMAZ ve çağıranın etiketini kullanır", () => {
    const rows = buildPaymentCalculationRows(AMOUNTS, PERCENTS, LABELS);
    const gross = rows.find((row) => row.key === "gross");
    const net = rows.find((row) => row.key === "net");

    expect(gross?.label).toBe("Brüt Hakediş");
    expect(gross?.tone).toBeUndefined();
    expect(net?.label).toBe("Net Tahsil");
    expect(net?.emphasis).toBe(true);
  });
});
