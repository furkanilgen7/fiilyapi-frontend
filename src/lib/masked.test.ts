import { describe, expect, it } from "vitest";

import { maskeli, maskesiz } from "./masked";

/**
 * `lib/masked` SINIRIN İKİ YÜZÜ — ve ikisi de bekçilidir.
 *
 * 🔴 Bu dosya 2026-09-19 denetiminden sonra açıldı: `maskesiz()` aylarca
 * doğrudan testsizdi ve o boşlukta GÖSTERİM yoluna taşındı (bkz.
 * `components/boq-assignment/masked-render.test.tsx` hikâyesi).
 */
describe("maskesiz — YAZMA yolunun freni", () => {
  it("maskeli değer gövdeye/hesaba giremez: ATAR", () => {
    expect(() => maskesiz(null, "quantity")).toThrow(/Maskelenmiş alan/);
  });

  it("hata metni ALANI söyler — hangi alanın durdurduğu görünür olmalı", () => {
    expect(() => maskesiz(null, "unit_price")).toThrow(/unit_price/);
  });

  it("🔴 POZİTİF KONTROL — maskesiz değer OLDUĞU GİBİ geçer", () => {
    expect(maskesiz("1900.000", "quantity")).toBe("1900.000");
  });

  it('🔴 SIFIR maskeli DEĞİLDİR — "0" gerçek bir sayıdır ve geçer', () => {
    expect(maskesiz("0", "quantity")).toBe("0");
  });
});

describe("maskeli — GÖSTERİM yolunun ayıracı", () => {
  it("null/undefined maskelidir", () => {
    expect(maskeli(null)).toBe(true);
    expect(maskeli(undefined)).toBe(true);
  });

  it('🔴 POZİTİF KONTROL — "0" ve boş dize maskeli DEĞİLDİR', () => {
    // `Boolean(value)` ile yazılmış bir uygulama burada ayrışır: "0" ve "" de
    // maskeli sayılır, ekran gerçek bir sıfırı "—" diye basardı.
    expect(maskeli("0")).toBe(false);
    expect(maskeli("")).toBe(false);
  });
});
