import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

import { Input } from "./Input";

// Vitest `css` secenegi kapalidir (vitest.config.ts'te yok -> varsayilan false),
// bu yuzden `import "./input.css"` jsdom'a HIC inmez ve mevcut testler
// `pointer-events` kurallarini GORMEZ. Kusuru yakalamak icin gercek dosyayi
// diskten okuyup jsdom'a enjekte ediyoruz: boylece test iddiasi sevk edilen
// CSS'in kendisine baglanir, kopyasina degil.
// jsdom ortaminda `import.meta.url` dosya semasi TASIMAZ; yol Vitest kokune
// (vitest.config.ts'in bulundugu dizin = process.cwd()) gore cozulur.
const CSS_PATH = path.resolve(process.cwd(), "src/components/ui/input/input.css");
let styleEl: HTMLStyleElement;

beforeAll(() => {
  styleEl = document.createElement("style");
  styleEl.textContent = readFileSync(CSS_PATH, "utf8");
  document.head.appendChild(styleEl);
});

afterAll(() => {
  styleEl.remove();
});

describe("input-icon yuvasi + pointer-events", () => {
  it("rightIcon icine konan bir dugme FARE ile tiklanabilir", async () => {
    // Canli kurban: src/app/login/LoginForm.tsx:137-146 sifre goster/gizle dugmesi.
    const onClick = vi.fn();
    render(
      <Input
        aria-label="Şifre"
        type="password"
        rightIcon={
          <button type="button" aria-label="Şifreyi göster" onClick={onClick} />
        }
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("dekoratif ikon pass-through kalir (tiklama input'a gecer)", () => {
    render(<Input aria-label="Tutar" numeric rightIcon={<span data-testid="tl">TL</span>} />);

    const decorative = screen.getByTestId("tl").parentElement as HTMLElement;
    expect(window.getComputedStyle(decorative).pointerEvents).toBe("none");
  });
});
