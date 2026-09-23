// KAYIT 130 · `.stok-segment` (DÖRT durum düğmesi) `overflow:hidden` taşıyor
// ama `flex-shrink:0` TAŞIMIYORDU: satırın toplam içeriği (bozuk arama
// kutusuyla birlikte) taşınca segment kutusu daralıyor ve "Normal"/"Fazla
// Stok" düğmeleri görünür alanın dışına atılıyordu. Ayrıca `Input`
// primitive'i `className`i SARMALAYAN `<span class="input-wrap">`e değil
// DOĞRUDAN iç `<input>`e uyguluyor; `stok-filters__search` (margin-left:
// auto; width:220px) bu yüzden yanlış elemana biniyordu — arama kutusunun
// büyüteç ikonu kutudan kopuk duruyordu.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StockFilterBar } from "./StockFilterBar";

const css = readFileSync(path.join(process.cwd(), "src/components/stock/stock.css"), "utf8");

function noop() {
  /* test dbl */
}

describe("StockFilterBar (kayıt 130)", () => {
  it("`.stok-segment` DÖRT düğmeyi kırpmaz — flex-shrink:0 taşır", () => {
    expect(css).toMatch(/\.stok-segment\s*{[^}]*flex-shrink:\s*0/);
  });

  it("arama kutusunun sarmalayıcı hizası bir DIŞ elemana uygulanır, ham `<input>`e DEĞİL", () => {
    render(
      <StockFilterBar
        status={undefined}
        category={undefined}
        query=""
        onStatusChange={noop}
        onCategoryChange={noop}
        onQueryChange={noop}
      />,
    );
    const input = screen.getByPlaceholderText("Malzeme ara...");
    // Ham input KENDİSİ artık stok-filters__search taşımaz — sarmalayıcıya taşındı.
    expect(input.className).not.toMatch(/stok-filters__search/);
    // Yakın atadan biri (input-wrap'ı saran dış span) bu sınıfı taşımalı,
    // böylece büyüteç ikonu ve input BİRLİKTE hizalanır.
    const outerWrap = input.closest(".stok-filters__search");
    expect(outerWrap).not.toBeNull();
    expect(outerWrap?.querySelector(".input-wrap")).not.toBeNull();
  });
});
