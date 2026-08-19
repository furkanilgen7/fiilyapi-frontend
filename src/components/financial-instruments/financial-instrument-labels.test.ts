import { describe, expect, it } from "vitest";

import type { FinancialInstrumentStatus } from "@/lib/api/hooks/useFinancialInstruments";

import {
  INSTRUMENT_TABS,
  instrumentBadge,
  instrumentTabFilter,
  instrumentTabFromParam,
} from "./financial-instrument-labels";

describe("E10:93-97 — üç sekme SÜZGECE çevrilir, ayrı uç DEĞİL", () => {
  it("sekme sırası ve etiketleri mockup'ın birebir sırasıdır", () => {
    expect(INSTRUMENT_TABS.map((t) => t.label)).toEqual([
      "Alınan Çekler", // E10:94
      "Verilen Çekler", // E10:95
      "Senetler", // E10:96
    ]);
  });

  it("Alınan Çekler → direction=received + instrument_kind=cheque", () => {
    expect(instrumentTabFilter("alinan")).toEqual({
      direction: "received",
      instrumentKind: "cheque",
    });
  });

  it("Verilen Çekler → direction=issued + instrument_kind=cheque", () => {
    expect(instrumentTabFilter("verilen")).toEqual({
      direction: "issued",
      instrumentKind: "cheque",
    });
  });

  it("🔴 Senetler YÖN SÜZMEZ — yalnız instrument_kind=promissory_note", () => {
    const filter = instrumentTabFilter("senet");
    expect(filter).toEqual({ instrumentKind: "promissory_note" });
    // Yön de süzülseydi VERİLEN senetler hiçbir sekmede görünmez, sessizce
    // kaybolurdu. Bu iddia o mutasyonu kırmızıya çevirir.
    expect(filter.direction).toBeUndefined();
  });

  it("🔴 üç sekmenin ürettiği süzgeç üçlüsü BİRBİRİNDEN AYRIŞIR", () => {
    const seen = INSTRUMENT_TABS.map((tab) => JSON.stringify(instrumentTabFilter(tab.key)));
    expect(new Set(seen).size).toBe(3);
  });

  it("tanınmayan/eksik URL değeri ilk sekmeye düşer", () => {
    expect(instrumentTabFromParam(null)).toBe("alinan");
    expect(instrumentTabFromParam("bilinmeyen")).toBe("alinan");
    expect(instrumentTabFromParam("senet")).toBe("senet");
    expect(instrumentTabFromParam("verilen")).toBe("verilen");
  });
});

describe("🔴 K3 — rozet `status` (kalıcı) + `is_due` (TÜREV) BİLEŞİMİDİR", () => {
  it("E10:121 portfolio + is_due ⇒ turuncu `Vadede`", () => {
    expect(instrumentBadge("portfolio", true)).toEqual({
      tone: "due",
      label: "Vadede",
      variant: "warning",
    });
  });

  it("E10:130 portfolio + !is_due ⇒ yeşil `Portföyde`", () => {
    expect(instrumentBadge("portfolio", false)).toEqual({
      tone: "portfolio",
      label: "Portföyde",
      variant: "success",
    });
  });

  it("E10:157 collected ⇒ mavi `Tahsil Edildi`", () => {
    expect(instrumentBadge("collected", false)).toEqual({
      tone: "settled",
      label: "Tahsil Edildi",
      variant: "primary",
    });
  });

  /**
   * 🔴 AYRIŞMA NOKTASI: `is_due` tek başına okunsaydı (yani `status`
   * denetlenmeseydi) vadesi geçmiş ama TAHSİL EDİLMİŞ bir çek turuncu
   * "Vadede" basardı — E10:157 orada MAVİ "Tahsil Edildi" ister.
   * Yalnız `portfolio` satırlarıyla yazılan bir test bu mutasyonu GEÇİRİR.
   */
  it("🔴 tahsil edilmiş bir kayıt `is_due` DOĞRU olsa bile Vadede BASMAZ", () => {
    expect(instrumentBadge("collected", true).label).toBe("Tahsil Edildi");
    expect(instrumentBadge("collected", true).variant).toBe("primary");
  });

  /**
   * Kardeş ayrışma: `is_due` hiç okunmasaydı portföydeki HER kayıt yeşil
   * "Portföyde" basardı. Yukarıdaki iki portföy iddiası bunu kırmızıya çevirir.
   */
  it("mockup'ta çizilmeyen üç durum SESSİZCE ATLANMAZ — nötr/mavi basar", () => {
    expect(instrumentBadge("paid", false)).toEqual({
      tone: "settled",
      label: "Ödendi",
      variant: "primary",
    });
    expect(instrumentBadge("returned", false)).toEqual({
      tone: "closed",
      label: "İade",
      variant: "neutral",
    });
    expect(instrumentBadge("cancelled", false)).toEqual({
      tone: "closed",
      label: "İptal",
      variant: "neutral",
    });
  });

  it("🔴 `FinancialInstrumentStatus` BEŞLİSİNİN TAMAMI etiketlenir — boş/undefined YOK", () => {
    const all: FinancialInstrumentStatus[] = [
      "portfolio",
      "collected",
      "paid",
      "returned",
      "cancelled",
    ];
    for (const status of all) {
      for (const isDue of [true, false]) {
        const badge = instrumentBadge(status, isDue);
        expect(badge.label.length, `${status}/${isDue}`).toBeGreaterThan(0);
      }
    }
  });
});
