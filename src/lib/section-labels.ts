import type { components } from "@/lib/api/schema";

export type SectionType = components["schemas"]["SectionType"];
export type SectionStatus = components["schemas"]["SectionStatus"];

// Bölüm türü etiketleri — `Form - Bölüm Ekle.dc.html` satır 70, spec §3.
// TEK KAYNAK: T2 (Bölüm Detay) ve T3 (tam sayfa form) bunu paylaşır, kopyalamaz
// (bkz. task-2-brief.md "Türkçe etiket eşlemeleri").
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  foundation_infra: "Temel & Altyapı",
  structural: "Kaba İnşaat",
  finishing: "İnce İşler",
  facade_roof: "Cephe & Çatı",
  // Düzeltme turu 1: brifingde backend docstring'inden "Mekanik-Elektrik" alınmıştı;
  // mockup'un kendisi (`Form - Bolum Ekle.dc.html` F70) "Mekanik / Elektrik" diyor —
  // 100% mockup sadakati kuralı gereği mockup kazanır.
  mep: "Mekanik / Elektrik",
  landscape: "Peyzaj",
  handover: "Teslimat & Kabul",
};

// Bölüm durumu etiketleri — `Form - Bölüm Ekle.dc.html` satır 71 + P6 spec §4/§7 S1.
// TEK KAYNAK: Bölüm Detay hero rozeti (D59) VE T3 formu BUNU kullanır.
export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  planned: "Planlandı",
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

// Durum -> görsel kategori sınıf eki. `on_hold` P6'da eklendi; mockup'ta özel
// tasarımı YOK (bkz. task-2-report.md gerekçesi — tasarım sistemindeki uyarı/
// bekletme tonu, `--color-warning` ailesi, seçildi). TEK KAYNAK: SectionCard
// (Şantiye Detay listesi) ve SectionDetailView (Bölüm Detay hero) bunu
// paylaşır — "on_hold: planned" kopyası artık YOK.
export const SECTION_STATUS_CLASS_SUFFIX: Record<SectionStatus, string> = {
  completed: "completed",
  active: "active",
  planned: "planned",
  on_hold: "on-hold",
};
