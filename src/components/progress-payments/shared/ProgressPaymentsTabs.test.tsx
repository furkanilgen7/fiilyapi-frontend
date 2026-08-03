import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsTabs } from "./ProgressPaymentsTabs";

describe("ProgressPaymentsTabs", () => {
  it("iki sekmeyi de gercek Link olarak basar, hrefler dogru", () => {
    render(<ProgressPaymentsTabs active="employer" />);
    expect(screen.getByRole("link", { name: "İşveren" })).toHaveAttribute("href", "/hakedisler");
    expect(screen.getByRole("link", { name: "Taşeron" })).toHaveAttribute(
      "href",
      "/hakedisler/taseron",
    );
  });

  // Final inceleme F-4: gercek tabpanel olmadigi icin tab/tablist rolleri
  // KULLANILMAZ — gezinme bolgesi + aria-current="page" beklenir.
  it("gezinme bolgesi olarak basar, tab/tablist rolu TASIMAZ", () => {
    render(<ProgressPaymentsTabs active="subcontractor" />);
    expect(screen.getByRole("navigation", { name: "Hakediş türü" })).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("aktif sekme aria-current=page tasir, digeri hic tasimaz", () => {
    render(<ProgressPaymentsTabs active="subcontractor" />);
    expect(screen.getByRole("link", { name: "Taşeron" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "İşveren" })).not.toHaveAttribute("aria-current");
  });

  it("aktif sekme aktif sinifini tasir", () => {
    render(<ProgressPaymentsTabs active="employer" />);
    expect(screen.getByRole("link", { name: "İşveren" })).toHaveClass("pp-tabs__tab--active");
    expect(screen.getByRole("link", { name: "Taşeron" })).not.toHaveClass("pp-tabs__tab--active");
  });
});
