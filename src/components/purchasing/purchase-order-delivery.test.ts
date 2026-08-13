import { describe, it, expect } from "vitest";

import {
  DELIVERY_SOON_DAYS,
  deliveryDaysLeft,
  deliveryTone,
} from "./purchase-order-delivery";

// Mockup'ın kendi kurgusu: "bugün" 19.07.2026 (SIP 65'teki kırmızı satır).
const TODAY = new Date(2026, 6, 19);

describe("deliveryTone — SIP teslimat rengi (mockup satırları)", () => {
  it("teslim edilmiş sipariş GEÇMİŞ tarihte bile nötrdür (88, 110)", () => {
    expect(deliveryTone("2026-07-15", "delivered", TODAY)).toBe("neutral");
    expect(deliveryTone("2026-07-10", "delivered", TODAY)).toBe("neutral");
  });

  it("teslim edilmemiş ve tarihi geçmiş/bugün olan satır kırmızıdır (65)", () => {
    expect(deliveryTone("2026-07-19", "in_transit", TODAY)).toBe("overdue");
    expect(deliveryTone("2026-07-18", "approved", TODAY)).toBe("overdue");
  });

  it("yaklaşan teslimat kehribardır (76, 98, 120)", () => {
    expect(deliveryTone("2026-07-20", "in_transit", TODAY)).toBe("soon");
    expect(deliveryTone("2026-07-22", "in_transit", TODAY)).toBe("soon");
    expect(deliveryTone("2026-07-24", "approved", TODAY)).toBe("soon");
  });

  it("eşiğin ötesindeki teslimat nötre döner", () => {
    const beyond = new Date(TODAY);
    beyond.setDate(beyond.getDate() + DELIVERY_SOON_DAYS + 1);
    const iso = `${beyond.getFullYear()}-08-${String(beyond.getDate()).padStart(2, "0")}`;
    expect(deliveryTone(iso, "approved", TODAY)).toBe("neutral");
    // Eşiğin TAM üstü hâlâ kehribardır (sınır dahildir).
    expect(deliveryTone("2026-07-26", "approved", TODAY)).toBe("soon");
  });

  it("tarihsiz sipariş renk İDDİA ETMEZ", () => {
    expect(deliveryTone(null, "in_transit", TODAY)).toBe("neutral");
    expect(deliveryDaysLeft(null, TODAY)).toBeNull();
  });

  it("çözülemeyen tarih sessizce renk uydurmaz", () => {
    expect(deliveryDaysLeft("bugün", TODAY)).toBeNull();
    expect(deliveryTone("bugün", "in_transit", TODAY)).toBe("neutral");
  });

  it("gün farkı UTC üzerinden sayılır — yerel saat kayması gün oynatmaz", () => {
    // Yerel gece yarısına yakın bir an: gün damgası yine 19 Temmuz'dur.
    const lateEvening = new Date(2026, 6, 19, 23, 30);
    expect(deliveryDaysLeft("2026-07-20", lateEvening)).toBe(1);
    expect(deliveryDaysLeft("2026-07-19", lateEvening)).toBe(0);
  });
});
