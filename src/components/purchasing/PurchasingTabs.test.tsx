import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PurchasingTabs, type PurchasingTab } from "./PurchasingTabs";

const ALL_TABS: PurchasingTab[] = ["requests", "quotes", "orders", "suppliers"];

describe("PurchasingTabs — SAT 89-94 sekme şeridi", () => {
  it("mockup'ın DÖRT sekmesini sırasıyla basar", () => {
    render(<PurchasingTabs active="requests" />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Satın Alma Talepleri",
      "Teklifler",
      "Siparişler",
      "Tedarikçiler",
    ]);
  });

  it("dördü de GERÇEK bağlantıdır (client-state sekmesi DEĞİL)", () => {
    render(<PurchasingTabs active="requests" />);
    expect(screen.getByRole("link", { name: "Satın Alma Talepleri" })).toHaveAttribute(
      "href",
      "/satinalma",
    );
    // spec K3: talep-bağımsız teklif listesi İCAT EDİLMEZ — aynı rota, süzgeç.
    expect(screen.getByRole("link", { name: "Teklifler" })).toHaveAttribute(
      "href",
      "/satinalma?durum=quote_wait",
    );
    expect(screen.getByRole("link", { name: "Siparişler" })).toHaveAttribute(
      "href",
      "/satinalma/siparisler",
    );
    expect(screen.getByRole("link", { name: "Tedarikçiler" })).toHaveAttribute(
      "href",
      "/satinalma/tedarikciler",
    );
  });

  // F-SD dersi: kök sekmesi `exact` olmadığı için İKİ öğe birden aktif
  // görünmüştü. Burada "Satın Alma Talepleri" ile "Teklifler" AYNI rotayı
  // paylaşır — çift aktiflik en olası kusurdur.
  it.each(ALL_TABS)("yalnız TEK sekme aktiftir (active=%s)", (active) => {
    render(<PurchasingTabs active={active} />);
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
  });

  it("aktif sekme aria-current='page' ve aktif sınıfı taşır", () => {
    render(<PurchasingTabs active="quotes" />);
    const quotes = screen.getByRole("link", { name: "Teklifler" });
    expect(quotes).toHaveAttribute("aria-current", "page");
    expect(quotes.className).toContain("sat-tabs__tab--active");
    expect(screen.getByRole("link", { name: "Satın Alma Talepleri" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("gezinme bölgesidir — tablist/tab rolleri KULLANILMAZ (gerçek tabpanel yok)", () => {
    render(<PurchasingTabs active="suppliers" />);
    expect(screen.getByRole("navigation", { name: "Satınalma bölümleri" })).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
