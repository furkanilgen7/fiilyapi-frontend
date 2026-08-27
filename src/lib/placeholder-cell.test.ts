import { describe, it, expect } from "vitest";

import { countCell, metricCell } from "./placeholder-cell";

/**
 * F-ILRUI — K-ZARF üç hâli.
 *
 * Zarfın dolu/boş ayrımı YALNIZ `available` bayrağından okunur; `pending_module`
 * varlığından DEĞİL. `CountPlaceholder`ın dolu zarfı `pending_module` TAŞIR
 * (backend `projects/schemas.py::CountPlaceholder` bilinçli emsali), dolayısıyla
 * `pending_module`a bakan bir okuma sayaçlarda KESİNLİKLE yanlıştır.
 */
const upper = (value: string | number) => `<${value}>`;
const asis = (value: number) => String(value);

describe("metricCell — MetricPlaceholder (alan adı `value`)", () => {
  it("1. hâl: available + değer dolu → biçimlenmiş metin, ipucu YOK", () => {
    expect(metricCell({ available: true, value: "17800000" }, upper)).toEqual({
      text: "<17800000>",
    });
  });

  it("2. hâl: available:false + pending_module dolu → metin yok, ipucu VAR", () => {
    expect(
      metricCell({ available: false, value: null, pending_module: "progress_payments" }, upper),
    ).toEqual({ text: null, hint: "Hakediş verisi bu yüzeye henüz bağlanmadı" });
  });

  it("3. hâl: available:false + pending_module null (rolün izni yok) → ipucu VERİLMEZ", () => {
    // `pendingModuleLabel(null)` "İlgili modülle birlikte gelir" der; bu hâlde
    // o cümle YALANDIR — modül var, izin yok.
    expect(metricCell({ available: false, value: null, pending_module: null }, upper)).toEqual({
      text: null,
    });
  });

  it("zarf hiç yokken (yükleme/hata) ipucu UYDURULMAZ", () => {
    expect(metricCell(undefined, upper)).toEqual({ text: null });
  });

  it("available:true ama value null → yer tutucudur (yalan sayı basılmaz)", () => {
    expect(metricCell({ available: true, value: null, pending_module: "contracts" }, upper)).toEqual(
      { text: null, hint: "Sözleşme verisi bu yüzeye henüz bağlanmadı" },
    );
  });

  it("`0` GERÇEK bir cevaptır — falsy tuzağına düşmez", () => {
    expect(metricCell({ available: true, value: 0 }, upper)).toEqual({ text: "<0>" });
  });

  // 🔴 MUTASYON DENETİMİ BULGUSU: `available` kontrolünü SİLEN mutant hayatta
  // kalmıştı, çünkü fikstürlerin hepsinde boş zarf `value: null` taşıyordu ve
  // "değer var mı" ile "available mı" ayrımı HİÇ ölçülmüyordu. Bayrak TEK
  // ölçüttür: değer dolu olsa BİLE `available:false` ise basılmaz.
  it("available:false + DEĞER DOLU → yine de yer tutucudur (ölçüt bayraktır)", () => {
    expect(
      metricCell({ available: false, value: "999", pending_module: "contracts" }, upper),
    ).toEqual({ text: null, hint: "Sözleşme verisi bu yüzeye henüz bağlanmadı" });
  });
});

describe("countCell — CountPlaceholder (alan adı `count`)", () => {
  it("dolu zarf `pending_module` TAŞISA BİLE değer basılır (bilinçli emsal)", () => {
    expect(countCell({ available: true, count: 48, pending_module: "timesheet" }, asis)).toEqual({
      text: "48",
    });
  });

  it("`count: 0` dolu bir cevaptır — yer tutucu sanılmaz", () => {
    expect(countCell({ available: true, count: 0, pending_module: "timesheet" }, asis)).toEqual({
      text: "0",
    });
  });

  it("available:false + pending_module dolu → ipucu VAR", () => {
    expect(countCell({ available: false, count: null, pending_module: "subcontracts" }, asis)).toEqual(
      { text: null, hint: "Taşeron sözleşmesi verisi bu yüzeye henüz bağlanmadı" },
    );
  });

  it("available:false + pending_module null → ipucu VERİLMEZ", () => {
    expect(countCell({ available: false, count: null, pending_module: null }, asis)).toEqual({
      text: null,
    });
  });

  it("available:false + SAYI DOLU → yine de yer tutucudur (ölçüt bayraktır)", () => {
    expect(countCell({ available: false, count: 48, pending_module: "timesheet" }, asis)).toEqual({
      text: null,
      hint: "Puantaj verisi bu yüzeye henüz bağlanmadı",
    });
  });
});
