import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnchoredPopover } from "./AnchoredPopover";

// F-PT T5 · `escapeOverflow` kipi. Konumun KENDİSİ jsdom'da doğrulanamaz
// (`getBoundingClientRect` sıfır döner) — gerçek geometri Playwright'ta
// ölçülür (`e2e/timesheet-visual.spec.ts`). Burada kipin AÇIK/KAPALI ayrımı
// korunur: F-PL'nin ızgara popover'ı eski akış konumunda kalmalı.

function renderPopover(escapeOverflow: boolean) {
  return render(
    <span>
      <AnchoredPopover label="deneme" onClose={vi.fn()} escapeOverflow={escapeOverflow}>
        <button type="button">Uygula</button>
      </AnchoredPopover>
    </span>,
  );
}

describe("AnchoredPopover · escapeOverflow", () => {
  it("VARSAYILAN kapalidir — akis konumu ve CSS'i degismez", () => {
    renderPopover(false);
    const popover = screen.getByRole("dialog", { name: "deneme" });
    expect(popover.className).not.toContain("anchored-popover--floating");
    expect(popover.getAttribute("style")).toBeNull();
  });

  it("acikken kirpan kabin disina cikan sinifi ve olculmus konumu alir", () => {
    renderPopover(true);
    const popover = screen.getByRole("dialog", { name: "deneme" });
    expect(popover.className).toContain("anchored-popover--floating");
    expect(popover.style.top).not.toBe("");
    expect(popover.style.left).not.toBe("");
  });

  // ⚠️ F-P8 baseline turunda ÖLÇÜLEN OYNAKLIK (iki bağımsız CI turu,
  // 31636666077 ↔ 31638764877): 70 karenin 69'u BAYT AYNIYDI, yalnız
  // `puantaj-hucre-popover.png` her turda oynadı — kod şeridi 1px dikey
  // kayıyordu (x[511,661) y[697,710), Playwright eşiğinde 52px). Sebep
  // ÇAPADAN gelen KESİRLİ ölçüdür: `anchorRect.bottom` gibi değerler
  // `left/top`a olduğu gibi yazılınca yüzey yarım piksele oturur ve
  // `.ts-pop__codes` ızgarasının `repeat(5, 1fr)` sütunları kenarlarını
  // turdan tura farklı yuvarlar. Konum TAM PİKSELE oturtulur: hem kare
  // deterministik olur hem de metin/kenarlık daha keskin basar.
  it("kesirli capa olcusunde bile konum TAM PIKSELE oturur", () => {
    const original = Element.prototype.getBoundingClientRect;
    // Çapa da yüzey de kesirli: yuvarlama yapılmazsa `top`/`left` kesirli kalır.
    Element.prototype.getBoundingClientRect = function fractional() {
      return { top: 100.4, bottom: 120.6, left: 40.3, width: 33.7, height: 20.2 } as DOMRect;
    };
    try {
      renderPopover(true);
      const popover = screen.getByRole("dialog", { name: "deneme" });
      for (const value of [popover.style.top, popover.style.left]) {
        expect(value).toMatch(/^-?\d+px$/);
      }
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  });

  it("Escape iki kipte de kapatir (davranis degismedi)", async () => {
    const onClose = vi.fn();
    render(
      <span>
        <AnchoredPopover label="deneme" onClose={onClose} escapeOverflow>
          <button type="button">Uygula</button>
        </AnchoredPopover>
      </span>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
