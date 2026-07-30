/**
 * Şantiye Belgeleri kartının içeriği — yer tutucu (spec §1.2, §4.6, §11.10).
 * Mockup satır 177–217. Yüzey `form-shell/DocumentsPlaceholderCard`'dan gelir;
 * metinler forma özgü olduğu için burada durur.
 *
 * Bu dilimde yükleme YOKTUR: alan seçici basılmaz, sürükleme işleyicisi
 * yazılmaz, gövdede belge anahtarı bulunmaz. Mockup'ta üç kutuda görünen
 * zorunluluk yıldızı (183, 188, 193) BASILMAZ — yüklenemeyen bir alanı
 * zorunlu göstermek yanlış olur (spec §4.6).
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";
import { pendingModuleLabel } from "@/lib/pending-modules";

/** İkon zeminleri spec §4.6 tablosundan; hepsi MEVCUT token, yeni renk yok. */
export const SITE_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "🏛",
    iconBg: "var(--color-danger-soft)", // #fee2e2 (182)
    title: "Yapı Ruhsatı",
    subtitle: "Belediye onaylı",
  },
  {
    emoji: "⛑",
    iconBg: "var(--color-warning-soft)", // #fef3c7 (187)
    title: "İSG Risk Değerlendirmesi",
    subtitle: "Şantiye başlangıcında zorunlu",
  },
  {
    emoji: "📋",
    iconBg: "var(--color-primary-soft)", // #dbeafe (192)
    title: "Acil Durum Planı",
    subtitle: "Tahliye ve müdahale planı",
  },
  {
    emoji: "📐",
    iconBg: "var(--color-accent-purple-soft)", // #ede9fe (197)
    title: "Şantiye Yerleşim Planı",
    subtitle: "Vaziyet planı, depo yerleşimi",
  },
  {
    emoji: "🔬",
    iconBg: "var(--color-success-soft)", // #dcfce7 (202)
    title: "Zemin Etüt Raporu",
    subtitle: "Jeoteknik rapor",
  },
  {
    emoji: "📷",
    iconBg: "var(--color-success-tint)", // #f0fdf4 (207)
    title: "Başlangıç Fotoğrafları",
    subtitle: "Arsa mevcut durumu",
  },
];

/** Metin envanteri (spec §15) #63, #64, #73, #74, #72. */
export const SITE_DOCUMENTS_TITLE = "📎 Şantiye Belgeleri";

export const SITE_DOCUMENTS_NOTE =
  "Belge modülü bekleniyor — şantiyeyi oluşturduktan sonra belgeleri yükleyebileceksiniz.";

export const SITE_DOCUMENTS_DROP_TITLE = "Diğer şantiye belgelerini sürükleyin";

export const SITE_DOCUMENTS_DROP_SUBTITLE =
  "Sigorta poliçesi, çevre izni, hafriyat izni vb.";

export const SITE_DOCUMENTS_SOON_TITLE = pendingModuleLabel("documents");
