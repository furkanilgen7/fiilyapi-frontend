import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsTabs } from "./ProgressPaymentsTabs";

describe("ProgressPaymentsTabs", () => {
  it("iki sekmeyi de gercek Link olarak basar, hrefler dogru", () => {
    render(<ProgressPaymentsTabs active="employer" />);
    expect(screen.getByRole("tab", { name: "İşveren" })).toHaveAttribute("href", "/hakedisler");
    expect(screen.getByRole("tab", { name: "Taşeron" })).toHaveAttribute(
      "href",
      "/hakedisler/taseron",
    );
  });

  it("aktif sekme aria-selected=true tasir, digeri false", () => {
    render(<ProgressPaymentsTabs active="subcontractor" />);
    expect(screen.getByRole("tab", { name: "Taşeron" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "İşveren" })).toHaveAttribute("aria-selected", "false");
  });

  it("aktif sekme aktif sinifini tasir", () => {
    render(<ProgressPaymentsTabs active="employer" />);
    expect(screen.getByRole("tab", { name: "İşveren" })).toHaveClass("pp-tabs__tab--active");
    expect(screen.getByRole("tab", { name: "Taşeron" })).not.toHaveClass("pp-tabs__tab--active");
  });
});
