import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

import { buildRecentEntryRows, DIARY_RECENT_ENTRY_LIMIT } from "./recent-entries";

// F-SD T6 · T3'ün "Son Kayıtlar" türevi (GK356-386). Kart bileşenden AYRI
// test edilir: burada YALNIZ saf dönüşüm doğrulanır (sıralama, kırpma, rozet
// türevleri, bölüm adı çözümü).

function listItem(overrides: Partial<SiteDiaryEntryListItem> = {}): SiteDiaryEntryListItem {
  return {
    id: "d-1",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: "2026-07-15",
    section_id: null,
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
  { id: "sec-1", name: "Kat 6–10 Kaba İnşaat" },
  { id: "sec-2", name: "Peyzaj" },
];

describe("buildRecentEntryRows", () => {
  it("GK360-364 etiketlerini mockup biçiminde üretir", () => {
    const [row] = buildRecentEntryRows(
      [listItem({ section_id: "sec-1", worker_total: 42, lines_total: "182400.00" })],
      SECTIONS,
    );

    expect(row).toMatchObject({
      entryDate: "2026-07-15",
      dateLabel: "15 Temmuz",
      statusLabel: "Gönderildi",
      isSubmitted: true,
      isRainy: false,
      workerLabel: "42 işçi",
      sectionLabel: "Kat 6–10 Kaba İnşaat",
      amountLabel: "₺ 182.400 hakediş katkısı",
    });
  });

  it("hava `rainy` ise kırmızı rozet türevini açar (GK372)", () => {
    const [rainy] = buildRecentEntryRows([listItem({ weather: "rainy" })], SECTIONS);
    const [cloudy] = buildRecentEntryRows([listItem({ weather: "partly_cloudy" })], SECTIONS);

    expect(rainy.isRainy).toBe(true);
    expect(cloudy.isRainy).toBe(false);
  });

  it("taslak kaydın rozeti 'Taslak'tır ve isSubmitted false döner", () => {
    const [row] = buildRecentEntryRows([listItem({ status: "draft" })], SECTIONS);

    expect(row.statusLabel).toBe("Taslak");
    expect(row.isSubmitted).toBe(false);
  });

  it("SUNUCU SIRASINA GÜVENMEZ — tarihe göre yeniden azalan sıralar", () => {
    const rows = buildRecentEntryRows(
      [
        listItem({ id: "d-a", entry_date: "2026-07-14" }),
        listItem({ id: "d-b", entry_date: "2026-07-16" }),
        listItem({ id: "d-c", entry_date: "2026-07-15" }),
      ],
      SECTIONS,
    );

    expect(rows.map((row) => row.entryDate)).toEqual(["2026-07-16", "2026-07-15", "2026-07-14"]);
  });

  it("girdi dizisini MUTASYONA UĞRATMAZ (sıralama kopya üzerinde)", () => {
    const items = [
      listItem({ id: "d-a", entry_date: "2026-07-14" }),
      listItem({ id: "d-b", entry_date: "2026-07-16" }),
    ];

    buildRecentEntryRows(items, SECTIONS);

    expect(items.map((item) => item.id)).toEqual(["d-a", "d-b"]);
  });

  it("varsayılan olarak mockup'ın üç satırına kırpar", () => {
    const rows = buildRecentEntryRows(
      Array.from({ length: 7 }, (_, index) =>
        listItem({ id: `d-${index}`, entry_date: `2026-07-${String(index + 10)}` }),
      ),
      SECTIONS,
    );

    expect(DIARY_RECENT_ENTRY_LIMIT).toBe(3);
    expect(rows).toHaveLength(3);
    // En YENİ üç gün kalır (kırpma sıralamadan SONRA).
    expect(rows.map((row) => row.entryDate)).toEqual(["2026-07-16", "2026-07-15", "2026-07-14"]);
  });

  it("bölüm seçilmemişse dürüst sabit metin basar (pending DEĞİL)", () => {
    const [row] = buildRecentEntryRows([listItem({ section_id: null })], SECTIONS);

    expect(row.sectionLabel).toBe("Bölüm seçilmedi");
  });

  it("bölüm kimliği çözülemiyorsa null döner — çağıran pending gösterir", () => {
    const [row] = buildRecentEntryRows([listItem({ section_id: "sec-yok" })], SECTIONS);

    expect(row.sectionLabel).toBeNull();
  });

  it("boş liste boş dizi döner (kart 'kayıt yok' dalına düşer)", () => {
    expect(buildRecentEntryRows([], SECTIONS)).toEqual([]);
  });
});
