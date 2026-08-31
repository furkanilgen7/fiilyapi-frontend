import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RaporlarPage from "./page";

/**
 * 🔴 R1 · `/raporlar` ARTIK CATCH-ALL'A DÜŞMEZ.
 *
 * Kusur: kabuk sidebar'ında "Raporlar" vardı, sayfa YOKTU; yol `[...slug]`
 * ComingSoon'una düşüyor ve kullanıcıya "yakında" gösteriyordu (ölü link).
 * Negatif iddia (`Bu modül yakında eklenecek.` YOK) bu deponun yerleşik
 * "rota artık gerçek" bekçisidir (`stok/page.test.tsx` emsali) — mutasyon
 * (bu klasörü silmek) onu kırmızıya çevirir.
 */
describe("/raporlar", () => {
  it("gerçek katalog ekranını basar", () => {
    render(<RaporlarPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Raporlar" })).toBeInTheDocument();
    expect(screen.getByTestId("rap-grid")).toBeInTheDocument();
  });

  it("ComingSoon metnini BASMAZ", () => {
    render(<RaporlarPage />);
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });
});
