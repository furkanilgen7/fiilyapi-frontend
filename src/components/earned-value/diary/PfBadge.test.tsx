import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { DEFAULT_PF_BANDS } from "@/lib/earned-value";

import { PfBadge } from "./PfBadge";

// K18: bant GÖSTERİLEN (2 ondalık ROUND_HALF_UP) değere uygulanır — renk ile metin çelişmez.
// K19: günlük PF > 1,05 bilgi (mavi) tonu.
describe("PfBadge", () => {
  it("0,9499 → '0,95' YEŞİL (ham değer kırmızıya düşerdi)", () => {
    render(<PfBadge value="0.9499" bands={DEFAULT_PF_BANDS} />);
    expect(screen.getByText("0,95")).toHaveClass("ev-diary-pf--green");
  });

  it("0,9449 → '0,94' kırmızı", () => {
    render(<PfBadge value="0.9449" bands={DEFAULT_PF_BANDS} />);
    expect(screen.getByText("0,94")).toHaveClass("ev-diary-pf--red");
  });

  it("günlük 1,0551 → '1,06' şüpheli yüksek (mavi); 1,0549 → '1,05' yeşil", () => {
    const { unmount } = render(<PfBadge value="1.0551" bands={DEFAULT_PF_BANDS} />);
    expect(screen.getByText("1,06")).toHaveClass("ev-diary-pf--high");
    unmount();
    render(<PfBadge value="1.0549" bands={DEFAULT_PF_BANDS} />);
    expect(screen.getByText("1,05")).toHaveClass("ev-diary-pf--green");
  });

  it("değer yok → '—' nötr", () => {
    render(<PfBadge value={null} bands={DEFAULT_PF_BANDS} />);
    expect(screen.getByText("—")).toHaveClass("ev-diary-pf--none");
  });
});
