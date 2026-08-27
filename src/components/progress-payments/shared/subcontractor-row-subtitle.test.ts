import { describe, it, expect } from "vitest";

import { buildSubcontractorRowSubtitle } from "./subcontractor-row-subtitle";

// Fix round 1 (coordinator review) — üç durumu ayrı ayrı kapsar:
// (a) section_id DOLU ama adı çözülemiyor → pending
// (b) section_id NULL → "Tüm Bölümler" (pending DEĞİL)
// (c) kategori + bölüm birlikte pending → tek birleşik gösterge (ayraç bozulmaz)
describe("buildSubcontractorRowSubtitle", () => {
  it("kategori VE bölüm gerçek değerse iki parça döner (mockup: 'Betonarme İşleri · Kat 6–8')", () => {
    // Not: bu hook'ta bölüm ADI hiçbir zaman çözülmez (yalnız section_id
    // vardır) — bu test yalnız "section_id null" (Tüm Bölümler) + gerçek
    // kategori kombinasyonunu kapsar; section_id DOLU iken asla "text" olmaz.
    const result = buildSubcontractorRowSubtitle("Betonarme İşleri", null);
    expect(result.isCombinedPending).toBe(false);
    expect(result.segments).toEqual([
      { kind: "text", value: "Betonarme İşleri" },
      { kind: "text", value: "Tüm Bölümler" },
    ]);
  });

  // (a) section_id DOLU ama adı çözülemiyor → pending gösterim + ipucu
  it("section_id DOLU ama adı çözülemiyorsa bölüm parçası pending döner, kategori GERÇEK kalır", () => {
    const result = buildSubcontractorRowSubtitle("Elektrik Tesisatı", "sec-9");
    expect(result.isCombinedPending).toBe(false);
    expect(result.segments).toEqual([
      { kind: "text", value: "Elektrik Tesisatı" },
      { kind: "pending", title: "Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)" },
    ]);
  });

  // (b) section_id NULL → "Tüm Bölümler" (pending DEĞİL) — kategori pending olsa bile.
  it("section_id NULL ise 'Tüm Bölümler' GERÇEK metnini döner (pending DEĞİL)", () => {
    const result = buildSubcontractorRowSubtitle(null, null);
    expect(result.isCombinedPending).toBe(false);
    expect(result.segments).toEqual([
      { kind: "pending", title: "İş kategorisi liste ucundan gelmiyor" },
      { kind: "text", value: "Tüm Bölümler" },
    ]);
  });

  // (c) kategori + bölüm birlikte pending → TEK birleşik gösterge, "— · —" YOK.
  it("kategori pending VE section_id dolu-ama-çözülemez ise TEK birleşik pending döner ('— · —' üretmez)", () => {
    const result = buildSubcontractorRowSubtitle(null, "sec-9");
    expect(result.isCombinedPending).toBe(true);
    expect(result.segments).toEqual([]);
    expect(result.combinedPendingTitle).toBe(
      "İş kategorisi liste ucundan gelmiyor; Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)",
    );
  });
  // 🔴 F-BLMSEK T2 — ÜÇÜNCÜ argüman: ÇÖZÜLMÜŞ bölüm adı. Bölüm Detay ekranı
  // bölümün adını ZATEN bilir (`section.name`); orada pending bir "—" basmak
  // elde olan gerçeği saklamak olurdu. Argüman VERİLMEZSE davranış AYNEN
  // korunur (şantiye Hakedişler ekranının DOM'u değişmez) — üstteki dört test
  // o yolu bekçiler, aşağıdaki ikisi yeni yolu.
  it("çözülmüş bölüm adı verilirse bölüm parçası GERÇEK metin olur (pending DEĞİL)", () => {
    const result = buildSubcontractorRowSubtitle("Elektrik Tesisatı", "sec-9", "Kat 6–10");
    expect(result.isCombinedPending).toBe(false);
    expect(result.segments).toEqual([
      { kind: "text", value: "Elektrik Tesisatı" },
      { kind: "text", value: "Kat 6–10" },
    ]);
  });

  it("çözülmüş ad verilse bile section_id NULL ise 'Tüm Bölümler' basılır (ad EZMEZ)", () => {
    // `null` = sözleşme kapsamı TÜM bölümler; bu bölümün adını basmak
    // kapsamı DARALTAN bir YALAN olurdu.
    const result = buildSubcontractorRowSubtitle("Betonarme İşleri", null, "Kat 6–10");
    expect(result.segments).toEqual([
      { kind: "text", value: "Betonarme İşleri" },
      { kind: "text", value: "Tüm Bölümler" },
    ]);
  });

  it("çözülmüş ad varsa kategori pending olsa da BİRLEŞİK pending'e DÜŞMEZ", () => {
    const result = buildSubcontractorRowSubtitle(null, "sec-9", "Kat 6–10");
    expect(result.isCombinedPending).toBe(false);
    expect(result.segments).toEqual([
      { kind: "pending", title: "İş kategorisi liste ucundan gelmiyor" },
      { kind: "text", value: "Kat 6–10" },
    ]);
  });
});
