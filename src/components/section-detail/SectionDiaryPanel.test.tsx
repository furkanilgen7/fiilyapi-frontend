import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

import { SectionDiaryPanel } from "./SectionDiaryPanel";

// F-BLMSEK T1 · Bölüm Detay › "Günlük Kayıt" sekmesinin gövdesi.

const PROJECT_ID = "p-1";
const SITE_ID = "s-1";
const SECTION_ID = "sec-target";
const SECTION_NAME = "Kat 6–10 Kaba İnşaat";
const DIARY_HREF = `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/gunluk-kayit`;

function listItem(overrides: Partial<SiteDiaryEntryListItem> = {}): SiteDiaryEntryListItem {
  return {
    id: "d-1",
    site_id: SITE_ID,
    project_id: PROJECT_ID,
    entry_date: "2026-07-15",
    section_id: SECTION_ID,
    weather: "sunny",
    has_incident: false,
    status: "submitted",
    worker_total: 42,
    lines_total: "182400.00",
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    section_name: SECTION_NAME,
    section_line_count: 3,
    ...overrides,
  } as SiteDiaryEntryListItem;
}

/** Detay rotası üreticisinin test ikizi — kimliği yola AYNEN yazar. */
const entryHref = (entryId: string) => `/detay/${entryId}`;

const SECTIONS = [
  { id: SECTION_ID, name: SECTION_NAME },
  { id: "sec-other", name: "Peyzaj" },
];

function renderPanel(props: Partial<React.ComponentProps<typeof SectionDiaryPanel>> = {}) {
  return render(
    <SectionDiaryPanel
      sectionId={SECTION_ID}
      sectionName={SECTION_NAME}
      sections={SECTIONS}
      items={[]}
      isLoading={false}
      isError={false}
      diaryHref={DIARY_HREF}
      entryHref={entryHref}
      {...props}
    />,
  );
}

describe("SectionDiaryPanel", () => {
  it("hata dalında listeyi DEĞİL, hatayı basar", () => {
    renderPanel({ isError: true, items: [listItem()] });

    expect(screen.getByText("Günlük kayıtlar yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("15 Temmuz")).not.toBeInTheDocument();
  });

  it("yükleme dalında listeyi DEĞİL, 'Yükleniyor…' basar", () => {
    renderPanel({ isLoading: true, items: [] });

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  // Kayıt 259 — kabuk (başlık + "Şantiye günlüğü →" çıkış bağlantısı) hata/
  // yükleme dalında da KORUNUR; yalnız gövde değişir. Eskiden bileşenin
  // TAMAMI erken dönüyordu ve kullanıcı bu iki dalda başlığı da çıkış
  // bağlantısını da kaybediyordu.
  it("hata dalında da BAŞLIK ve 'Şantiye günlüğü →' çıkış bağlantısı KORUNUR", () => {
    renderPanel({ isError: true });

    expect(screen.getByTestId("section-diary")).toBeInTheDocument();
    expect(screen.getByText(`${SECTION_NAME} · Günlük Kayıtlar`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Şantiye günlüğü →" })).toHaveAttribute(
      "href",
      DIARY_HREF,
    );
    expect(screen.getByTestId("section-diary-error")).toHaveTextContent(
      "Günlük kayıtlar yüklenemedi",
    );
  });

  it("yükleme dalında da BAŞLIK ve 'Şantiye günlüğü →' çıkış bağlantısı KORUNUR", () => {
    renderPanel({ isLoading: true });

    expect(screen.getByTestId("section-diary")).toBeInTheDocument();
    expect(screen.getByText(`${SECTION_NAME} · Günlük Kayıtlar`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Şantiye günlüğü →" })).toHaveAttribute(
      "href",
      DIARY_HREF,
    );
  });

  it("hata dalı yükleme dalını EZER (ikisi birdenken hata basılır)", () => {
    renderPanel({ isError: true, isLoading: true });

    expect(screen.getByText("Günlük kayıtlar yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });

  it("DET-1.1 · Kural A — SUNUCU yanıtı neyse o: başlığı başka bölüm olan gün listede KALIR", () => {
    // İstemci süzgeci (`section-diary.ts`) KALKTI: liste `?section_id=` ile
    // sunucuda süzülür ve "başlığı bu bölüm ∪ bu bölüme satır yazılmış gün"
    // kümesini döner. İstemci yeniden süzseydi satır kolu SESSİZCE kaybolurdu.
    renderPanel({
      items: [
        listItem({ id: "hedef", entry_date: "2026-07-15" }),
        listItem({ id: "satirli", section_id: "sec-other", entry_date: "2026-07-16" }),
        listItem({ id: "basliksiz", section_id: null, entry_date: "2026-07-17" }),
      ],
    });

    expect(screen.getByText("15 Temmuz")).toBeInTheDocument();
    expect(screen.getByText("16 Temmuz")).toBeInTheDocument();
    expect(screen.getByText("17 Temmuz")).toBeInTheDocument();
    expect(screen.queryByTestId("section-diary-note")).not.toBeInTheDocument();
  });

  it("üç satırdan FAZLASINI da basar — 'Son Kayıtlar' kırpması buraya MİRAS KALMAZ", () => {
    renderPanel({
      items: [
        listItem({ id: "a", entry_date: "2026-07-11" }),
        listItem({ id: "b", entry_date: "2026-07-12" }),
        listItem({ id: "c", entry_date: "2026-07-13" }),
        listItem({ id: "d", entry_date: "2026-07-14" }),
      ],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("11 Temmuz")).toBeInTheDocument();
  });

  it("BOŞ listede bile BÖLÜM ADINI basar (kapsamını kendi söyler)", () => {
    // 🔴 F-BLMPUAN dersi: boş durumun dürüstlüğü, kartın KENDİ KAPSAMINI
    // adlandırmasında yaşıyordu ve o özellik bekçisizdi. Burada bekçilenir.
    renderPanel({ items: [] });

    expect(screen.getByTestId("section-diary")).toHaveTextContent(SECTION_NAME);
    expect(screen.getByText("Bu bölümde günlük kayıt yok")).toBeInTheDocument();
  });

  it("boş durum 'veri yok' der, 'modül kırılmıyor' DEMEZ", () => {
    const { container } = renderPanel({ items: [] });

    expect(container.textContent).not.toContain("kırılmıyor");
    expect(screen.getByText("Bu bölüme atanmış günlük kayıt bulunmuyor")).toBeInTheDocument();
  });

  it("sunucu toplamı listeden BÜYÜKSE kırpılma notu GÖRÜNÜR basılır (sessiz kırpma yok)", () => {
    renderPanel({ items: [listItem({ id: "a" }), listItem({ id: "b", entry_date: "2026-07-16" })], total: 5 });

    const note = screen.getByTestId("section-diary-note");
    expect(note).toHaveTextContent("İlk 2 kayıt gösteriliyor (toplam 5) — liste eksik.");
    expect(within(note).getByRole("link")).toHaveAttribute("href", DIARY_HREF);
  });

  it("liste TAMKEN kırpılma notu BASILMAZ", () => {
    renderPanel({ items: [listItem({ id: "hedef" })], total: 1 });

    expect(screen.queryByTestId("section-diary-note")).not.toBeInTheDocument();
  });
});

// DET-1.2 — satır ARTIK tıklanabilir: tamamı detay sayfasına tek bağlantı.
describe("SectionDiaryPanel — tıklanabilir satır (DET-1.2)", () => {
  it("satırın TAMAMI tek bağlantıdır ve DOĞRU kaydın detayına gider", () => {
    renderPanel({
      items: [
        listItem({ id: "d-15", entry_date: "2026-07-15" }),
        listItem({ id: "d-16", entry_date: "2026-07-16" }),
      ],
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      // Satırda TEK bağlantı vardır ve içerik (tarih/rozet/meta) onun İÇİNDEDİR.
      const links = within(row).getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveTextContent(/Temmuz/);
    }
    expect(screen.getByRole("link", { name: /^16\.07\.2026 / })).toHaveAttribute("href", "/detay/d-16");
    expect(screen.getByRole("link", { name: /^15\.07\.2026 / })).toHaveAttribute("href", "/detay/d-15");
  });

  it("erişilebilir ad TARİH + DURUM taşır", () => {
    renderPanel({
      items: [
        listItem({ id: "g", entry_date: "2026-07-15", status: "submitted" }),
        listItem({ id: "t", entry_date: "2026-07-14", status: "draft" }),
      ],
    });

    expect(
      screen.getByRole("link", { name: "15.07.2026 günlük kaydını görüntüle · Gönderildi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "14.07.2026 günlük kaydını görüntüle · Taslak" }),
    ).toBeInTheDocument();
  });

  it("satır sonu ok SVG ikonudur ve dekoratiftir (aria-hidden)", () => {
    renderPanel({ items: [listItem()] });

    const link = screen.getByRole("link", { name: /günlük kaydını görüntüle/ });
    const arrow = link.querySelector("svg.section-diary__entry-arrow");
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute("aria-hidden", "true");
  });

  it("S1 — taslak rozeti bu listede AMBER sınıfını taşır", () => {
    renderPanel({ items: [listItem({ status: "draft" })] });

    const badge = screen.getByText("Taslak");
    expect(badge).toHaveClass("diary-recent__badge--draft");
    // Amber tonu bölüm listesine KAPSAMLI kuraldan gelir (bkz. section-detail.css.test.ts).
    expect(badge.closest(".section-diary__entry-link")).not.toBeNull();
  });

  it("Kural A — başlık bu bölüm olan günde 'Satırla bağlı' rozeti BASILMAZ", () => {
    renderPanel({ items: [listItem()] });

    expect(screen.queryByText("Satırla bağlı")).not.toBeInTheDocument();
  });

  it("Kural A — başlığı BAŞKA bölüm olan gün: 'Satırla bağlı' rozeti + başlık bölümü adı", () => {
    renderPanel({
      items: [
        listItem({ id: "k", section_id: "sec-other", section_name: "Peyzaj", section_line_count: 2, entry_date: "2026-07-15" }),
      ],
    });

    const link = screen.getByRole("link", {
      name: "15.07.2026 günlük kaydını görüntüle · Gönderildi — başlık bölümü Peyzaj",
    });
    expect(within(link).getByText("Satırla bağlı")).toHaveClass("section-diary__linkage-badge");
    // Mockup Detay 571: "Başlık: Kat 1–5 · bu bölüme 2 satır" — sayı sunucudan (backend#130).
    expect(link).toHaveTextContent("Başlık: Peyzaj · bu bölüme 2 satır");
  });

  it("Kural A — başlık adı SUNUCUDAN (`section_name`) gelir; sayı yoksa (null) uydurulmaz", () => {
    renderPanel({
      items: [listItem({ id: "k", section_id: "sec-other", section_name: "Peyzaj (yeni ad)", section_line_count: null })],
    });

    const link = screen.getByRole("link", { name: /başlık bölümü Peyzaj \(yeni ad\)$/ });
    expect(link).toHaveTextContent("Başlık: Peyzaj (yeni ad)");
    expect(link).not.toHaveTextContent(/bu bölüme \d+ satır/);
  });

  it("Kural A — başlık bölümü SEÇİLMEMİŞ gün de satırla bağlıdır ('Bölüm seçilmedi')", () => {
    renderPanel({ items: [listItem({ id: "n", section_id: null, section_name: null, section_line_count: 1, entry_date: "2026-07-15" })] });

    const link = screen.getByRole("link", { name: /başlık bölümü Bölüm seçilmedi$/ });
    expect(within(link).getByText("Satırla bağlı")).toBeInTheDocument();
    expect(link).toHaveTextContent("Başlık: Bölüm seçilmedi · bu bölüme 1 satır");
  });
});
