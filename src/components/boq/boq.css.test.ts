// @vitest-environment node
// Not: site-detail.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin
// testi. Yalnızca kuralın stylesheet'te VAR OLDUĞUNU doğrular; gerçek cascade
// davranışını doğrulamaz. Kural yanlışlıkla silinirse testi kırar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./boq.css", import.meta.url)), "utf8");

describe("boq.css — mockup kuralları (regresyon koruması)", () => {
  // Mockup 163: son poz satırında alt çizgi YOK. Satıra sınıf eklenmez, kural
  // :last-child ile yazılır (spec §3.3).
  it("son gövde satırının alt çizgisini :last-child ile kaldırır", () => {
    expect(css).toMatch(/\.boq-table tbody tr:last-child[^{]*{[^}]*border-bottom:\s*none/);
  });

  // Spec §5.2: büyük harfe çevirme CSS ile yapılır, JS toLocaleUpperCase ile değil.
  it("grup başlığını CSS ile büyük harfe çevirir", () => {
    expect(css).toMatch(/\.boq-table__group[^{]*{[^}]*text-transform:\s*uppercase/);
  });

  // Spec §5.4 / karar 9: eşik renkleri P7'ye bırakıldı — ölü sınıf yazılmaz.
  it("Gerç. % için eşik renk sınıfı tanımlamaz (P7'ye bırakıldı)", () => {
    expect(css).not.toMatch(/\.boq-table__pct--(success|warning|danger)/);
  });

  // Mockup 174: GENEL TOPLAM satırının zemini ve 2px üst çizgisi F2'de token'a
  // çevrildi; çıplak değere dönülmesini engeller.
  it("GENEL TOPLAM satırını --color-info-tint ve --border-width-total ile boyar", () => {
    expect(css).toMatch(
      /\.boq-table__total-row[^{]*{[^}]*--color-info-tint[^}]*--border-width-total/s,
    );
  });

  // Yer tutucu hâl mockup renginden (177 `--color-primary`) SONRA gelmeli,
  // yoksa aynı özgüllükte kaybeder ve `—` mavi/vurgulu basılır (spec §5.4).
  it("--pending kuralı --total-pct kuralından sonra gelir (cascade sırası)", () => {
    const totalPctAt = css.indexOf(".boq-table__total-pct");
    expect(totalPctAt).toBeGreaterThan(-1);
    expect(css.indexOf(".boq-table__pct--pending")).toBeGreaterThan(totalPctAt);
  });

  it("breadcrumb linki :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.boq__crumb-link:focus-visible\s*{[^}]*--focus-ring/);
  });

  it("çıplak hex renk içermez (tüm renkler token'dan gelir)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
