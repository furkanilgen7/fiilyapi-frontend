import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SectionCard } from "./SectionCard";
import type { SectionResponse } from "./SectionCard";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

const BASE_SECTION: SectionResponse = {
  id: "55555555-5555-5555-5555-555555555555",
  code: "A-01",
  name: "Kat 6–10 Kaba İnşaat",
  status: "active",
  manager_name: "Sercan Öztürk",
  start_date: "2026-01-01",
  end_date: "2026-09-30",
  sort_order: 0,
  progress_pct: { available: false, value: null, pending_module: "boq" },
  boq_item_count: { available: false, count: null, pending_module: "boq" },
  budget: { available: false, value: null, pending_module: "boq" },
  worker_count: { available: false, count: null, pending_module: "timesheet" },
};

function renderCard(overrides: Partial<SectionResponse> = {}) {
  return render(
    <SectionCard projectId={PROJECT_ID} siteId={SITE_ID} section={{ ...BASE_SECTION, ...overrides }} />,
  );
}

describe("SectionCard — durum etiketleri (spec §5.4, mockup birebir)", () => {
  it("completed durumu icin 'Tamamlandı' basar", () => {
    renderCard({ status: "completed" });
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
  });

  it("active durumu icin 'Aktif — Devam Ediyor' basar", () => {
    renderCard({ status: "active" });
    expect(screen.getByText("Aktif — Devam Ediyor")).toBeInTheDocument();
  });

  it("planned durumu icin 'Planlandı' basar", () => {
    renderCard({ status: "planned" });
    expect(screen.getByText("Planlandı")).toBeInTheDocument();
  });
});

describe("SectionCard — eylem duruma gore degisir (spec §5.4)", () => {
  // KOD INCELEME BULGUSU: buton olay isleyicisi olmayan sessiz bir kontroldu.
  // Bolum duzenleme ekrani henuz yok — daldaki diger yazilmamis eylemlerle ayni
  // §7.3 muamelesi: gorunur kalir, aria-disabled verilmez, title ile soylenir.
  it("planned -> 'Düzenle' butonu gorunur kalir ve 'Bu bölüm yakında' title'i tasir (§7.3)", () => {
    renderCard({ status: "planned" });
    const btn = screen.getByRole("button", { name: "Düzenle" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("title", "Bu bölüm yakında");
    expect(btn).not.toHaveAttribute("aria-disabled");
    expect(btn).not.toBeDisabled();
    expect(screen.queryByRole("link", { name: /Detay/ })).not.toBeInTheDocument();
  });

  it("active -> 'Detay →' baglantisi", () => {
    renderCard({ status: "active" });
    const link = screen.getByRole("link", { name: "Detay →" });
    expect(link).toHaveAttribute(
      "href",
      `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/bolumler/${BASE_SECTION.id}`,
    );
    expect(screen.queryByRole("button", { name: "Düzenle" })).not.toBeInTheDocument();
  });

  it("completed -> 'Detay →' baglantisi", () => {
    renderCard({ status: "completed" });
    expect(screen.getByRole("link", { name: "Detay →" })).toBeInTheDocument();
  });
});

// Mockup KAZANIR: metrik etiketleri duruma gore degisir (mockup satir
// 168-182 / 242-256 / 279-292). Spec §5.4 sabit dortlu yaziyordu, guncellendi.
describe("SectionCard — metrik etiketleri duruma gore degisir (mockup birebir)", () => {
  it("completed -> İlerleme · İş Kalemleri · Bölüm Bedeli · İşçi (zirve)", () => {
    renderCard({ status: "completed" });
    expect(screen.getByText("İlerleme")).toBeInTheDocument();
    expect(screen.getByText("İş Kalemleri")).toBeInTheDocument();
    expect(screen.getByText("Bölüm Bedeli")).toBeInTheDocument();
    expect(screen.getByText("İşçi (zirve)")).toBeInTheDocument();
    expect(screen.queryByText("Aktif İşçi")).not.toBeInTheDocument();
    expect(screen.queryByText("Tahmini Bedel")).not.toBeInTheDocument();
    expect(screen.queryByText("Planlanan İşçi")).not.toBeInTheDocument();
  });

  it("active -> İlerleme · İş Kalemleri · Bölüm Bedeli · Aktif İşçi", () => {
    renderCard({ status: "active" });
    expect(screen.getByText("İlerleme")).toBeInTheDocument();
    expect(screen.getByText("İş Kalemleri")).toBeInTheDocument();
    expect(screen.getByText("Bölüm Bedeli")).toBeInTheDocument();
    expect(screen.getByText("Aktif İşçi")).toBeInTheDocument();
    expect(screen.queryByText("İşçi (zirve)")).not.toBeInTheDocument();
    expect(screen.queryByText("Tahmini Bedel")).not.toBeInTheDocument();
    expect(screen.queryByText("Planlanan İşçi")).not.toBeInTheDocument();
  });

  it("planned -> İlerleme · İş Kalemleri · Tahmini Bedel · Planlanan İşçi", () => {
    renderCard({ status: "planned" });
    expect(screen.getByText("İlerleme")).toBeInTheDocument();
    expect(screen.getByText("İş Kalemleri")).toBeInTheDocument();
    expect(screen.getByText("Tahmini Bedel")).toBeInTheDocument();
    expect(screen.getByText("Planlanan İşçi")).toBeInTheDocument();
    expect(screen.queryByText("Bölüm Bedeli")).not.toBeInTheDocument();
    expect(screen.queryByText("İşçi (zirve)")).not.toBeInTheDocument();
    expect(screen.queryByText("Aktif İşçi")).not.toBeInTheDocument();
  });
});

describe("SectionCard — 4 metrik hepsi yer tutucu (spec §5.4, §7.1)", () => {
  it("dort metrigin dordu de '—' basar ve title tasir", () => {
    renderCard();
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(4);
    dashes.forEach((el) => expect(el).toHaveAttribute("title"));
  });

  it("gercek deger geldiginde yer tutucu yerine gercek deger basilir", () => {
    renderCard({
      boq_item_count: { available: true, count: 14, pending_module: "boq" },
    });
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  // KOD INCELEME BULGUSU: MetricCell yalniz `available` bayragina bakiyordu —
  // available: true + deger null gelirse hucre BOS kaliyordu. Daldaki diger tum
  // yer tutucular (SiteCard/SiteHeroBar) bayrak VE deger kontrol eder.
  it("available: true ama deger null ise em dash basar, hucre bos kalmaz", () => {
    renderCard({
      boq_item_count: { available: true, count: null, pending_module: "boq" },
      budget: { available: true, value: null, pending_module: "boq" },
    });
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(4);
    dashes.forEach((el) => expect(el).toHaveAttribute("title"));
  });
});

// KOD INCELEME BULGUSU: bu iki metrik ham basiliyordu ("%62", "8400000.00")
// oysa SiteCard/SiteHeroBar ayni sekilleri paylasilan bicimlendiricilerden
// geciriyor.
describe("SectionCard — sayilar paylasilan bicimlendiricilerden gecer", () => {
  it("ilerleme formatPercent ile basilir (tr-TR ondalik)", () => {
    renderCard({ progress_pct: { available: true, value: "62.5", pending_module: "boq" } });
    expect(screen.getByText("%62,5")).toBeInTheDocument();
  });

  it("bolum bedeli formatCompactCurrency ile basilir", () => {
    renderCard({ budget: { available: true, value: "8400000.00", pending_module: "boq" } });
    expect(screen.getByText("₺ 8,4M")).toBeInTheDocument();
  });
});

describe("SectionCard — İlerleme çubuğu (spec §7.1, mockup her durumda çizer)", () => {
  it("yer tutucuyken bos iz cizilir, dolgu basilmaz", () => {
    renderCard();
    const track = screen.getByTestId("section-card-progress-track");
    expect(track).toBeInTheDocument();
    expect(screen.queryByTestId("section-card-progress-fill")).not.toBeInTheDocument();
  });

  it("gercek deger geldiginde dolgu yuzdeye gore genislik alir", () => {
    renderCard({ progress_pct: { available: true, value: "62", pending_module: "boq" } });
    const fill = screen.getByTestId("section-card-progress-fill");
    expect(fill).toHaveStyle({ width: "62%" });
  });

  it("tamamlandi durumunda yesil (basari) sinifi tasir, aktif sinifi tasimaz (mockup satir 169-170/206-207)", () => {
    renderCard({
      status: "completed",
      progress_pct: { available: true, value: "100", pending_module: "boq" },
    });
    const track = screen.getByTestId("section-card-progress-track");
    const fill = screen.getByTestId("section-card-progress-fill");
    const value = screen.getByText("%100");

    expect(track.className).toContain("section-card__metric-progress--completed");
    expect(fill.className).toContain("section-card__metric-progress--completed");
    expect(value.className).toContain("section-card__metric-progress--completed");

    expect(track.className).not.toContain("section-card__metric-progress--active");
    expect(fill.className).not.toContain("section-card__metric-progress--active");
    expect(value.className).not.toContain("section-card__metric-progress--active");
  });

  it("aktif durumunda mavi sinifi tasir, tamamlandi sinifi tasimaz (mockup satir 243-244)", () => {
    renderCard({
      status: "active",
      progress_pct: { available: true, value: "62", pending_module: "boq" },
    });
    const track = screen.getByTestId("section-card-progress-track");
    const fill = screen.getByTestId("section-card-progress-fill");
    const value = screen.getByText("%62");

    expect(track.className).toContain("section-card__metric-progress--active");
    expect(fill.className).toContain("section-card__metric-progress--active");
    expect(value.className).toContain("section-card__metric-progress--active");

    expect(track.className).not.toContain("section-card__metric-progress--completed");
    expect(fill.className).not.toContain("section-card__metric-progress--completed");
    expect(value.className).not.toContain("section-card__metric-progress--completed");
  });

  it("yer tutucuyken durum siniflarindan hicbiri uygulanmaz", () => {
    renderCard({ status: "completed" });
    const track = screen.getByTestId("section-card-progress-track");
    expect(track.className).not.toContain("section-card__metric-progress--completed");
    expect(track.className).not.toContain("section-card__metric-progress--active");
    expect(track.className).not.toContain("section-card__metric-progress--planned");
  });
});

describe("SectionCard — '3 gecikme riski' BASILMAZ (spec §7.2)", () => {
  it("mockup'ta olsa da bu metin hicbir statude gorunmez", () => {
    renderCard({ status: "active" });
    expect(screen.queryByText(/gecikme riski/i)).not.toBeInTheDocument();
  });
});

describe("SectionCard — tarih ve sorumlu satiri", () => {
  it("ad ve sorumlu bilgisini basar", () => {
    renderCard({ manager_name: "M. Arslan" });
    expect(screen.getByText(/Sorumlu: M\. Arslan/)).toBeInTheDocument();
  });

  it("sorumlu atanmamissa 'Atanmadı' basar", () => {
    renderCard({ manager_name: null });
    expect(screen.getByText(/Atanmadı/)).toBeInTheDocument();
  });
});

// Davranissal klavye odak testi (kod inceleme bulgusu duzeltmesi — Task 12 takibi):
// css.test.ts yalniz CSS metnini dogrular; gercek odaklanabilirlik/Tab sirasi
// jsdom + Testing Library ile burada dogrulanir.
describe("SectionCard — eylem klavyeyle odaklanabilir (davranissal)", () => {
  it("planned -> 'Duzenle' butonu Tab ile odaklanir", async () => {
    const user = userEvent.setup();
    renderCard({ status: "planned" });
    await user.tab();
    expect(screen.getByRole("button", { name: "Düzenle" })).toHaveFocus();
  });

  it("active -> 'Detay →' baglantisi Tab ile odaklanir", async () => {
    const user = userEvent.setup();
    renderCard({ status: "active" });
    await user.tab();
    expect(screen.getByRole("link", { name: "Detay →" })).toHaveFocus();
  });

  it("completed -> 'Detay →' baglantisi Tab ile odaklanir", async () => {
    const user = userEvent.setup();
    renderCard({ status: "completed" });
    await user.tab();
    expect(screen.getByRole("link", { name: "Detay →" })).toHaveFocus();
  });
});
