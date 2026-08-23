// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { barWidthPct } from "./bar-ratio";

const source = readFileSync(fileURLToPath(new URL("./bar-ratio.ts", import.meta.url)), "utf8");

describe("barWidthPct", () => {
  it("KY 92 'harcanan/butce' oranini yuzdeye cevirir", () => {
    // Arrange + Act + Assert — 10.240.000 / 15.058.823,53 ≈ %68
    expect(barWidthPct("10240000.00", "15058823.53")).toBe("68.00");
  });

  it("tam oranlari kesin basar", () => {
    // Ölçek SABİTTİR (iki hane): "25" değil "25.00". Sabit ölçek, çubuk
    // genişliğinin anlık görüntülerde oynamasını engeller.
    expect(barWidthPct("50", "200")).toBe("25.00");
    expect(barWidthPct("8400000.00", "8400000.00")).toBe("100");
  });

  /**
   * 🔴 K4 AYRIŞMA NOKTASI 1 — İKİLİ KAYAN NOKTA.
   * `0.1 + 0.2 !== 0.3` ailesinin bölme hâli: `Number(0.07)/Number(0.7)`
   * JS'te `0.09999999999999999` verir ve naif bir `* 100` `%9,999…` basardı.
   * BigInt tabanlı bölme tam `%10` verir.
   */
  it("ikili kayan nokta ayrisma noktasinda TAM deger verir (0.07 / 0.7)", () => {
    expect(Number(0.07) / Number(0.7)).not.toBe(0.1); // ayrışmanın kendisi
    expect(barWidthPct("0.07", "0.70")).toBe("10.00");
  });

  /**
   * 🔴 K4 AYRIŞMA NOKTASI 2 — HALF_UP ile HALF_EVEN farkı.
   * `2.5` tam yarımdır: Python `decimal` (ve bu modül) `3`e, JS `Math.round`
   * ise pozitifte yine `3`e ama BANKACI yuvarlaması `2`ye giderdi. Ölçek
   * sınırında yarım kalan bir oranın YUKARI gittiğini çakar.
   */
  it("tam yarim ondalikta SIFIRDAN UZAGA yuvarlar (HALF_UP)", () => {
    // 1 / 8 = 0.125 → %12,50
    expect(barWidthPct("1", "8")).toBe("12.50");
    // 1 / 1600 = 0.000625 → %0,0625 → iki haneye HALF_UP → "0.06"
    expect(barWidthPct("1", "1600")).toBe("0.06");
  });

  /**
   * 🔴 K4 AYRIŞMA NOKTASI 3 — BÖLMENİN KENDİSİNDE KAYAN NOKTA HATASI.
   *
   * Bu, ilk yazdığım `2^53` noktasının YERİNE geçti: o nokta ÖLÇÜLDÜ ve
   * AYIRT ETMEDİĞİ görüldü — iki hane ölçekte `2^53 / (2^53+1)` zaten
   * `%100`e yuvarlanır, yani test kayan noktayı değil kendi ölçeğini
   * sınıyordu (sahte kırmızının aynası: SAHTE YEŞİL olurdu).
   *
   * İKİ TAHMİNİM DE ÖLÇÜLEREK ÇÜRÜTÜLDÜ: `0.29/0.58` ve `0.17/0.25` bu
   * motorda `*100` düzeyinde TAM sonuç veriyor, yani hiçbir şeyi ayırt
   * etmiyorlardı — geçen bir test, ama YANLIŞ SEBEPLE (sahte yeşilin
   * "iddiası hiç değerlendirilmeyen test" hâli). Ayrışan çiftler bu yüzden
   * TAHMİN EDİLMEDİ, TARANARAK bulundu:
   *
   *   `0.14 / 0.25` → tam `%56`, kayan nokta `%56.00000000000001` (YUKARI)
   *   `0.11 / 0.20` → tam `%55`, kayan nokta `%54.99999999999999`  (AŞAĞI)
   *
   * İki YÖN de sınanır: tek yönlü örnek, yuvarlama hatasının yalnız bir
   * tarafını kapatırdı.
   */
  it("bolmenin kendisindeki kayan nokta hatasina DUSMEZ (iki yon)", () => {
    // Ayrışmaların kendisi — JS bölmesi tam değeri VERMİYOR.
    expect((0.14 / 0.25) * 100).not.toBe(56);
    expect((0.11 / 0.2) * 100).not.toBe(55);

    // BigInt bölme ikisini de TAM verir.
    expect(barWidthPct("0.14", "0.25")).toBe("56.00");
    expect(barWidthPct("0.11", "0.20")).toBe("55.00");
  });

  it("butce SIFIRSA null doner - %0 basmaz", () => {
    // "girilmedi" ile "hic harcanmadi" ayni sey degildir.
    expect(barWidthPct("1000", "0")).toBeNull();
    expect(barWidthPct("0", "0")).toBeNull();
  });

  it("eksik taraf null ise null doner", () => {
    expect(barWidthPct(null, "100")).toBeNull();
    expect(barWidthPct("100", null)).toBeNull();
  });

  it("butceyi ASAN harcamada %100'de KIRPILIR", () => {
    expect(barWidthPct("30000", "10000")).toBe("100");
  });

  it("negatif oranda 0'a kirpilir (cubuk ters cizilmez)", () => {
    expect(barWidthPct("-500", "10000")).toBe("0");
  });
});

/**
 * K4'ün YAPISAL YASAĞI: türev `src/lib/decimal.ts`e gider, bu dosyada kayan
 * nokta aritmetiği HİÇ yapılmaz — istisnasız.
 *
 * 🔴 YASAK KODA UYGULANIR, YORUMA DEĞİL. İlk hâli ham kaynağı tarıyordu ve
 * dosyanın KENDİ açıklama cümlesine ("`Number(`/`Math.` ile DEĞİL") takıldı —
 * `project-summary-labels.test.ts`teki çıplak glif yasağının düştüğü tuzağın
 * aynısı. Yorumlar SÖKÜLÜR, sonra kod taranır.
 */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

describe("bar-ratio.ts — yapısal yasak", () => {
  // Bekçinin kendisi çürümesin: yorum sökücü her şeyi silmiş olamaz.
  it("yorum sokucu KODU birakir (saglik kontrolu)", () => {
    expect(code).toMatch(/export function barWidthPct/);
    expect(code).not.toMatch(/ROUND_HALF_UP/); // yalnız yorumda geçer
  });

  it("bolme ve carpma decimal.ts'ten gelir", () => {
    expect(code).toMatch(/divideDecimalStrings/);
    expect(code).toMatch(/multiplyDecimalStrings/);
  });

  it("KODDA Number( / Math. HIC kullanilmaz (istisnasiz)", () => {
    expect(code).not.toMatch(/\bNumber\(|\bMath\./);
  });
});
