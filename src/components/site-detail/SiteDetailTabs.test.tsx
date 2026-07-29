import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteDetailTabs } from "./SiteDetailTabs";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";
const BASE = `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`;

describe("SiteDetailTabs (spec §5.3)", () => {
  it("role=tablist icinde 6 sekme basar", () => {
    render(<SiteDetailTabs projectId={PROJECT_ID} siteId={SITE_ID} activePath={BASE} />);
    const tablist = screen.getByRole("tablist", { name: "Şantiye detay sekmeleri" });
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Bölümler",
      "Puantaj",
      "Stok",
      "Hakedişler",
      "Günlük Kayıt",
      "Belgeler",
    ]);
  });

  it("yalniz Bolumler aktif yolda aria-selected tasir", () => {
    render(<SiteDetailTabs projectId={PROJECT_ID} siteId={SITE_ID} activePath={BASE} />);
    expect(screen.getByRole("tab", { name: "Bölümler" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Puantaj" })).toHaveAttribute("aria-selected", "false");
  });

  it("yazilmamis sekmeler gorunur kalir, gezinilebilir, title 'Bu bolum yakinda' tasir, aria-disabled verilmez", () => {
    render(<SiteDetailTabs projectId={PROJECT_ID} siteId={SITE_ID} activePath={BASE} />);
    const puantaj = screen.getByRole("tab", { name: "Puantaj" });
    expect(puantaj).toHaveAttribute("href", `${BASE}/puantaj`);
    expect(puantaj).toHaveAttribute("title", "Bu bölüm yakında");
    expect(puantaj).not.toHaveAttribute("aria-disabled");

    const gunlukKayit = screen.getByRole("tab", { name: "Günlük Kayıt" });
    expect(gunlukKayit).toHaveAttribute("href", `${BASE}/gunluk-kayit`);

    const belgeler = screen.getByRole("tab", { name: "Belgeler" });
    expect(belgeler).toHaveAttribute("href", `${BASE}/belgeler`);
  });

  it("Bolumler sekmesi title tasimaz (yazilmis rota)", () => {
    render(<SiteDetailTabs projectId={PROJECT_ID} siteId={SITE_ID} activePath={BASE} />);
    expect(screen.getByRole("tab", { name: "Bölümler" })).not.toHaveAttribute("title");
  });
});

// Davranissal klavye odak testi (kod inceleme bulgusu duzeltmesi — Task 12 takibi):
// css.test.ts yalniz CSS metnini dogrular; gercek odaklanabilirlik/Tab sirasi
// jsdom + Testing Library ile burada dogrulanir.
describe("SiteDetailTabs — klavye ile odaklanabilirlik ve sekme sirasi (davranissal)", () => {
  it("Tab ile butun sekmelere sirayla odaklanilabilir", async () => {
    const user = userEvent.setup();
    render(<SiteDetailTabs projectId={PROJECT_ID} siteId={SITE_ID} activePath={BASE} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);

    for (const tab of tabs) {
      await user.tab();
      expect(tab).toHaveFocus();
    }
  });
});
