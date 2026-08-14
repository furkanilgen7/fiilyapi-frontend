import type { EquipmentCategory } from "@/lib/api/hooks/useEquipment";

/**
 * K11 — kategori ikonu TEK DOSYADA haritalanır. MK-1 ikonu DB'de tutmaz
 * (backend spec: "ikon kategoriden türer, frontend haritasıdır"); M1'in altı
 * emojisi (🏗🚜🔧🚛⚙️🏭) `EquipmentCategory` enum'unun altı değerine
 * BİREBİR eşlenir.
 *
 * Mockup (`Makine & Ekipman.dc.html`) her kartta yalnızca EMOJİ çizer,
 * kategori adını YAZMAZ — hangi emojinin hangi enum değerine karşılık
 * geldiği ekipman ADI/tanımından çıkarıldı (satır numaraları):
 *   90  🏗 "Tower Crane TC-48"       → crane      (vinç)
 *   103 🚜 "Ekskavatör CAT 320"      → machinery  (iş makinesi)
 *   116 🔧 "Beton Pompası BP-36"     → concrete   (beton ekipmanı)
 *   129 🚛 "Damperli Kamyon ..."     → truck      (kamyon)
 *   142 ⚙️ "Forklift Linde H30"      → hand_tool  (elemeyle son kalan kategori)
 *   155 🏭 "Seyyar Kompresör SC-200" → compressor (kompresör)
 *
 * ⚠️ VARSAYIM: mockup kartları kategori adını taşımadığı için 142'deki
 * forklift ⇄ `hand_tool` eşleşmesi ELEMEYLE (kalan tek kategori) kuruldu —
 * semantik olarak forklift bir "el aleti" değildir ama altı örnek kartın altı
 * kategoriyi birer kez göstermesi amaçlandığı için bu, tutarlı tek okumadır.
 * Raporda ayrıca not edilir; kullanıcı/PM onayı gerekirse gözden geçirilir.
 */
export const EQUIPMENT_CATEGORY_ICONS: Record<EquipmentCategory, string> = {
  crane: "🏗",
  machinery: "🚜",
  concrete: "🔧",
  truck: "🚛",
  hand_tool: "⚙️",
  compressor: "🏭",
};

export function equipmentCategoryIcon(category: EquipmentCategory): string {
  return EQUIPMENT_CATEGORY_ICONS[category];
}
