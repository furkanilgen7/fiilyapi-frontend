import { describe, it, expect } from "vitest";

import type { SubcontractorContractItemResponse } from "@/lib/api/hooks/useSubcontractorContractMutations";
import type { SubcontractorProgressPaymentLineRead } from "@/lib/api/hooks/useSubcontractorProgressPayments";

import { buildItemProgressPct } from "./subcontractor-item-progress";

/**
 * KAPSAM MASKESİ — TSD 103 "Hakediş %" türevinin PAYDASI.
 *
 * ⚠️ **BU DOSYA BİR ÇÜRÜME BEKÇİSİDİR, KIRMIZIDAN DOĞMADI.** Dürüstlük kaydı:
 * davranış zaten doğruydu — ama YALNIZ TESADÜFEN. `quantity: null` maskeli
 * pozu eleyen şey açık bir maske kontrolü değil, `Number(null)` → **0** →
 * `0 <= 0` eşiğine takılmasıydı. Eşik bir gün `< 0` olsaydı (ya da payda
 * kontrolü kaldırılsaydı) maskeli poz `billed / 0` ile `Infinity` yüzde basardı
 * ve hiçbir test görmezdi.
 *
 * Bu yüzden üretim kodunda maske AÇIKÇA elenir ve bu test o açık kuralı
 * kilitler: yarın eşik değişse bile maskeli metraj oran ÜRETMEZ.
 *
 * 🔴 Hakediş satırının (`SubcontractorProgressPaymentLineRead`) `quantity`si
 * BU KORUMAYA GİRMEZ ve bu ölçüldü: şemada tipi `string`tir (nullable DEĞİL),
 * çünkü `progress_payments` kısıtlı bir modül değildir ve o uçta maske hiç
 * koşmaz. Erişilemeyen bir hâl için dal açmak spekülasyon olurdu.
 */

function item(
  overrides: Partial<SubcontractorContractItemResponse> & { id: string },
): SubcontractorContractItemResponse {
  return {
    contract_id: "sc-1",
    source_contract_item_id: null,
    code: "03.001",
    description: "Poz",
    unit: "m³",
    quantity: "100.000",
    unit_price: "1200.00",
    sort_order: 0,
    group: null,
    line_total: "120000.00",
    ...overrides,
  } as SubcontractorContractItemResponse;
}

function line(
  overrides: Partial<SubcontractorProgressPaymentLineRead> & { id: string },
): SubcontractorProgressPaymentLineRead {
  return {
    contract_item_id: null,
    code: "03.001",
    description: "Poz",
    unit: "m³",
    contract_unit_price: "1200.00",
    coefficient: "1.00",
    quantity: "0.000",
    group_name: null,
    sort_order: 0,
    quantity_source: "manual",
    adjusted_unit_price: "1200.00",
    line_total: "0.00",
    ...overrides,
  } as SubcontractorProgressPaymentLineRead;
}

describe("buildItemProgressPct — maskeli metraj oran ÜRETMEZ", () => {
  it("sözleşme miktarı maskeliyse (null) poz haritaya GİRMEZ", () => {
    const map = buildItemProgressPct(
      [item({ id: "it-1", quantity: null })],
      [line({ id: "ln-1", contract_item_id: "it-1", quantity: "40.000" })],
    );
    expect(map.has("it-1")).toBe(false);
  });

  it("maskeli poz elense de GÖRÜNÜR kardeşi haritada KALIR (toplu eleme değil)", () => {
    const map = buildItemProgressPct(
      [item({ id: "it-1", quantity: null }), item({ id: "it-2", quantity: "200.000" })],
      [
        line({ id: "ln-1", contract_item_id: "it-1", quantity: "40.000" }),
        line({ id: "ln-2", contract_item_id: "it-2", quantity: "50.000" }),
      ],
    );
    expect(map.has("it-1")).toBe(false);
    expect(map.get("it-2")).toBe(25);
  });

  it("🔴 POZİTİF KONTROL — görünür metrajda oran bozulmadan hesaplanır", () => {
    const map = buildItemProgressPct(
      [item({ id: "it-1", quantity: "200.000" })],
      [line({ id: "ln-1", contract_item_id: "it-1", quantity: "50.000" })],
    );
    expect(map.get("it-1")).toBe(25);
  });
});
