import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SiteHeroBar } from "./SiteHeroBar";
import type { SiteDetail } from "@/lib/api/hooks/useSites";

const SITE: SiteDetail = {
  id: "44444444-4444-4444-4444-444444444444",
  code: "A-BLOK",
  name: "A-Blok Şantiyesi",
  status: "active",
  address: "Kuyubaşı Mah.",
  city: "Ankara",
  city_inherited: false,
  site_manager_name: "Sercan Öztürk",
  start_date: "2025-03-01",
  end_date: "2026-12-31",
  delivery_date: null,
  remaining_days: 157,
  section_count: 5,
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  progress_pct: { available: false, value: null, pending_module: "progress_payments" },
  project: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Güneşkent Konut",
    city: "Ankara",
    employer_name: "Güneşkent Gayrimenkul A.Ş.",
  },
  section_status_counts: { planned: 2, active: 1, completed: 2 },
  sections: [],
  total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
  contract_amount: { available: false, value: null, pending_module: "contracts" },
};

describe("SiteHeroBar — baslik ve meta (spec §5.2)", () => {
  it("ust satir, baslik ve meta satirini basar", () => {
    render(<SiteHeroBar site={SITE} />);
    expect(
      screen.getByText("Güneşkent Konut Projesi · İşveren: Güneşkent Gayrimenkul A.Ş."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeInTheDocument();
    expect(screen.getByText(/Kuyubaşı Mah\. Ankara/)).toBeInTheDocument();
    expect(screen.getByText(/Şantiye Şefi: Sercan Öztürk/)).toBeInTheDocument();
  });

  it("Gunluk Kayit ve + Bolum Ekle eylemlerini basar", () => {
    render(<SiteHeroBar site={SITE} />);
    const gunlukKayit = screen.getByRole("link", { name: "Günlük Kayıt" });
    expect(gunlukKayit).toHaveAttribute(
      "href",
      "/projeler/11111111-1111-1111-1111-111111111111/santiyeler/44444444-4444-4444-4444-444444444444/gunluk-kayit",
    );
    expect(gunlukKayit).toHaveAttribute("title", "Bu bölüm yakında");
    expect(screen.getByRole("button", { name: "+ Bölüm Ekle" })).toBeInTheDocument();
  });
});

describe("SiteHeroBar — 5 KPI hucresi gercek/yer tutucu ayrimi (spec §5.2, task-8 brief)", () => {
  it("Fiziksel Ilerleme yer tutucudur — '—' basar, title ile aciklama verir, cubuk cizilmez", () => {
    render(<SiteHeroBar site={SITE} />);
    const cell = screen.getByTestId("site-hero-kpi-progress");
    expect(within(cell).getByText("Fiziksel İlerleme")).toBeInTheDocument();
    const value = within(cell).getByTitle("Hakediş modülüyle birlikte gelir");
    expect(value).toHaveTextContent("—");
    expect(screen.queryByTestId("site-hero-progress-fill")).not.toBeInTheDocument();
  });

  it("Fiziksel Ilerleme gercek veriyse yuzde + cubuk basar", () => {
    const withProgress: SiteDetail = {
      ...SITE,
      progress_pct: { available: true, value: "75", pending_module: "" },
    };
    render(<SiteHeroBar site={withProgress} />);
    expect(within(screen.getByTestId("site-hero-kpi-progress")).getByText("%75")).toBeInTheDocument();
    expect(screen.getByTestId("site-hero-progress-fill")).toBeInTheDocument();
  });

  it("Aktif Isci yer tutucudur", () => {
    render(<SiteHeroBar site={SITE} />);
    const cell = screen.getByTestId("site-hero-kpi-worker");
    expect(within(cell).getByText("Aktif İşçi")).toBeInTheDocument();
    const value = within(cell).getByTitle("Puantaj modülüyle birlikte gelir");
    expect(value).toHaveTextContent("—");
  });

  it("Aktif Isci gercek veriyse sayiyi basar", () => {
    const withWorkers: SiteDetail = {
      ...SITE,
      worker_count: { available: true, count: 48, pending_module: "" },
    };
    render(<SiteHeroBar site={withWorkers} />);
    expect(within(screen.getByTestId("site-hero-kpi-worker")).getByText("48")).toBeInTheDocument();
  });

  it("Toplam Hakedis yer tutucudur", () => {
    render(<SiteHeroBar site={SITE} />);
    const cell = screen.getByTestId("site-hero-kpi-payment");
    expect(within(cell).getByText("Toplam Hakediş")).toBeInTheDocument();
    const value = within(cell).getByTitle("Hakediş modülüyle birlikte gelir");
    expect(value).toHaveTextContent("—");
  });

  it("Kalan Gun gercek degerdir — yer tutucu degil, ay-yil alt notu tasir", () => {
    render(<SiteHeroBar site={SITE} />);
    const cell = screen.getByTestId("site-hero-kpi-days");
    expect(within(cell).getByText("Kalan Gün")).toBeInTheDocument();
    expect(within(cell).getByText("157")).toBeInTheDocument();
    expect(within(cell).getByText("Ara 2026")).toBeInTheDocument();
    expect(within(cell).queryByTitle(/birlikte gelir/)).not.toBeInTheDocument();
  });

  it("Kalan Gun negatifse kirmizi 'X gun gecikme' basar (spec §7.5)", () => {
    const delayed: SiteDetail = { ...SITE, remaining_days: -12 };
    render(<SiteHeroBar site={delayed} />);
    const value = within(screen.getByTestId("site-hero-kpi-days")).getByText("12 gün gecikme");
    expect(value.className).toContain("site-hero__kpi-value--delay");
  });

  it("Bolum Sayisi gercek degerdir — section_count + aktif/bekliyor kirilimi (task-8 brief)", () => {
    render(<SiteHeroBar site={SITE} />);
    const cell = screen.getByTestId("site-hero-kpi-sections");
    expect(within(cell).getByText("Bölüm Sayısı")).toBeInTheDocument();
    expect(within(cell).getByText("5")).toBeInTheDocument();
    expect(within(cell).getByText("1 aktif · 2 bekliyor")).toBeInTheDocument();
    expect(within(cell).queryByTitle(/birlikte gelir/)).not.toBeInTheDocument();
  });

  it("Bolumsuz santiyede Bolum Sayisi 0 basar, yer tutucu degildir (spec §7.4)", () => {
    const empty: SiteDetail = {
      ...SITE,
      section_count: 0,
      section_status_counts: { planned: 0, active: 0, completed: 0 },
    };
    render(<SiteHeroBar site={empty} />);
    const cell = screen.getByTestId("site-hero-kpi-sections");
    const value = within(cell).getByText("0");
    expect(value.className).not.toContain("pending");
  });
});
