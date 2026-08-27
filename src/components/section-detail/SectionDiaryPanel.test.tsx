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
    ...overrides,
  } as SiteDiaryEntryListItem;
}

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
      {...props}
    />,
  );
}

describe("SectionDiaryPanel", () => {
  it("hata dalında listeyi DEĞİL, hatayı basar", () => {
    renderPanel({ isError: true, items: [listItem()] });

    expect(screen.getByText("Günlük kayıtlar yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByTestId("section-diary")).not.toBeInTheDocument();
  });

  it("yükleme dalında listeyi DEĞİL, 'Yükleniyor…' basar", () => {
    renderPanel({ isLoading: true, items: [] });

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByTestId("section-diary")).not.toBeInTheDocument();
  });

  it("hata dalı yükleme dalını EZER (ikisi birdenken hata basılır)", () => {
    renderPanel({ isError: true, isLoading: true });

    expect(screen.getByText("Günlük kayıtlar yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });

  it("hedef bölümün kayıtlarını basar, BAŞKA bölümünkini basmaz", () => {
    renderPanel({
      items: [
        listItem({ id: "hedef", entry_date: "2026-07-15" }),
        listItem({ id: "baska", section_id: "sec-other", entry_date: "2026-07-16" }),
      ],
    });

    expect(screen.getByText("15 Temmuz")).toBeInTheDocument();
    expect(screen.queryByText("16 Temmuz")).not.toBeInTheDocument();
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

  it("atanmamış kayıtlar SESSİZCE düşürülmez — sayısı ve yeri görünür basılır", () => {
    renderPanel({
      items: [
        listItem({ id: "hedef" }),
        listItem({ id: "atanmamis-1", section_id: null, entry_date: "2026-07-01" }),
        listItem({ id: "atanmamis-2", section_id: null, entry_date: "2026-07-02" }),
      ],
    });

    const note = screen.getByTestId("section-diary-note");
    expect(note).toHaveTextContent("Bölüme atanmamış 2 kayıt bu listede yok");
    expect(note).toHaveTextContent("şantiye günlüğünde görünür");
    // Bağlantı NOTUN İÇİNDE olmalı — başlıktaki genel bağlantı bu iddiayı
    // karşılamaz (kullanıcı "nerede görünür" cevabını notta okur).
    expect(within(note).getByRole("link")).toHaveAttribute("href", DIARY_HREF);
  });

  it("başka bölümün kayıtları da not satırında SAYILIR", () => {
    renderPanel({
      items: [
        listItem({ id: "hedef" }),
        listItem({ id: "baska", section_id: "sec-other", entry_date: "2026-07-03" }),
      ],
    });

    expect(screen.getByTestId("section-diary-note")).toHaveTextContent("başka bölüme atanmış 1");
  });

  it("dışarıda kalan kayıt YOKKEN not satırı BASILMAZ", () => {
    renderPanel({ items: [listItem({ id: "hedef" })] });

    expect(screen.queryByTestId("section-diary-note")).not.toBeInTheDocument();
  });
});
