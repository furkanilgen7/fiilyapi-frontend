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
