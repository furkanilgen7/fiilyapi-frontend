import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteCard } from "./SiteCard";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

const ACTIVE_SITE: SiteListItem = {
  id: "22222222-2222-2222-2222-222222222222",
  code: "A-BLOK",
  name: "A-Blok Şantiyesi",
  status: "active",
  address: "Kuyubaşı Mah.",
  city: "Ankara",
  city_inherited: false,
  site_manager_name: "S. Öztürk",
  start_date: "2025-03-01",
  end_date: "2026-12-31",
  delivery_date: null,
  remaining_days: 157,
  section_count: 5,
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  progress_pct: { available: false, value: null, pending_module: "progress_payments" },
};

const COMPLETED_SITE: SiteListItem = {
  ...ACTIVE_SITE,
  id: "33333333-3333-3333-3333-333333333333",
  name: "B-Blok Şantiyesi",
  status: "completed",
  site_manager_name: "K. Arslan",
  end_date: null,
  delivery_date: "2026-05-01",
  remaining_days: null,
};

describe("SiteCard — aktif varyant (spec §4.3)", () => {
  it("ad, alt satir ve Aktif rozetini basar", () => {
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    expect(screen.getByRole("heading", { level: 3, name: "A-Blok Şantiyesi" })).toBeInTheDocument();
    expect(screen.getByText("Kuyubaşı Mah. · Şantiye Şefi: S. Öztürk")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("Kalan Gün gercek veriden pozitif basar", () => {
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    expect(screen.getByText("157")).toBeInTheDocument();
    expect(screen.getByText("Kalan Gün")).toBeInTheDocument();
  });

  it("4 cip basar: Is Kalemleri, Isveren Hak., Taseron Hak., Detay", () => {
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    expect(screen.getByRole("link", { name: /İş Kalemleri/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /İşveren Hak\./ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Taşeron Hak\./ })).toBeInTheDocument();
    const detay = screen.getByRole("link", { name: /Detay/ });
    expect(detay).toHaveAttribute(
      "href",
      `/projeler/${PROJECT_ID}/santiyeler/${ACTIVE_SITE.id}`,
    );
  });
});

describe("SiteCard — on_hold rozeti (kod inceleme bulgusu)", () => {
  it("Beklemede rozeti kendi sinifini tasir, aktif (yesil) sinifina dusmez", () => {
    const onHoldSite: SiteListItem = { ...ACTIVE_SITE, status: "on_hold" };
    render(<SiteCard projectId={PROJECT_ID} site={onHoldSite} />);
    const badge = screen.getByText("Beklemede");
    expect(badge.className).toContain("site-card__status--pending");
    expect(badge.className).not.toContain("site-card__status--active");
  });
});

describe("SiteCard — tamamlanmis varyant (spec §4.3)", () => {
  it("Tamamlandi rozetini basar", () => {
    render(<SiteCard projectId={PROJECT_ID} site={COMPLETED_SITE} />);
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
  });

  it("ucuncu hucrede Teslim + tarihi basar, Kalan Gun basmaz", () => {
    render(<SiteCard projectId={PROJECT_ID} site={COMPLETED_SITE} />);
    expect(screen.getByText("Teslim")).toBeInTheDocument();
    expect(screen.getByText("May 2026")).toBeInTheDocument();
    expect(screen.queryByText("Kalan Gün")).not.toBeInTheDocument();
  });

  it("3 cip basar (Taseron Hak. yok), Isveren Hak. yerine Final Hakedis gorunur", () => {
    render(<SiteCard projectId={PROJECT_ID} site={COMPLETED_SITE} />);
    expect(screen.getByRole("link", { name: /İş Kalemleri/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Final Hakediş/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Taşeron Hak\./ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /İşveren Hak\./ })).not.toBeInTheDocument();
  });
});

describe("SiteCard — yer tutucu hucreler (spec §7.1)", () => {
  it("Isci ve Ilerleme yer tutucuysa '—' basar ve title'da aciklama verir", () => {
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    const worker = screen.getByTitle("Puantaj modülüyle birlikte gelir");
    expect(worker).toHaveTextContent("—");
    const progress = screen.getByTitle("Hakediş modülüyle birlikte gelir");
    expect(progress).toHaveTextContent("—");
  });

  it("Ilerleme yer tutucuyken cubuk cizilmez (sahte %0 verilmez)", () => {
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    expect(screen.queryByTestId("site-card-progress-fill")).not.toBeInTheDocument();
  });

  it("Ilerleme gercek veriyse cubuk cizilir", () => {
    const withProgress: SiteListItem = {
      ...ACTIVE_SITE,
      progress_pct: { available: true, value: "75", pending_module: "" },
    };
    render(<SiteCard projectId={PROJECT_ID} site={withProgress} />);
    expect(screen.getByTestId("site-card-progress-fill")).toBeInTheDocument();
    expect(screen.getByText("%75")).toBeInTheDocument();
  });
});

describe("SiteCard — gecikmis teslim (spec §7.5)", () => {
  it("remaining_days negatifse kirmizi 'X gun gecikme' basar", () => {
    const delayed: SiteListItem = { ...ACTIVE_SITE, remaining_days: -12 };
    render(<SiteCard projectId={PROJECT_ID} site={delayed} />);
    const value = screen.getByText("12 gün gecikme");
    expect(value.className).toContain("site-card__kpi-value--delay");
  });
});

// Davranissal klavye odak testi (kod inceleme bulgusu duzeltmesi — Task 12 takibi):
// css.test.ts yalniz CSS metnini dogrular; gercek odaklanabilirlik/Tab sirasi
// jsdom + Testing Library ile burada dogrulanir.
describe("SiteCard — kart cipleri klavyeyle odaklanabilir ve Tab sirasindadir (davranissal)", () => {
  it("4 cip de sirayla Tab ile odaklanir", async () => {
    const user = userEvent.setup();
    render(<SiteCard projectId={PROJECT_ID} site={ACTIVE_SITE} />);
    const chips = screen.getAllByRole("link");
    expect(chips).toHaveLength(4);

    for (const chip of chips) {
      await user.tab();
      expect(chip).toHaveFocus();
    }
  });
});
