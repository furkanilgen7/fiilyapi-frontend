/**
 * Proje Belgeleri kartının içeriği — P1.1b yer tutucusu (spec §8, §7.11).
 * Mockup satır 162–209. Yüzey `form-shell/DocumentsPlaceholderCard`'dan gelir;
 * metinler forma özgü olduğu için burada durur.
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";

export const PROJECT_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📄",
    iconBg: "var(--color-danger-soft)",
    title: "İşveren Sözleşmesi",
    subtitle: "İmzalı PDF nüsha",
  },
  {
    emoji: "📊",
    iconBg: "var(--color-success-soft)",
    title: "Poz Listesi (BOQ)",
    subtitle: "Excel · Otomatik içe aktarılır",
  },
  {
    emoji: "🏛",
    iconBg: "var(--color-warning-soft)",
    title: "Yapı Ruhsatı",
    subtitle: "Belediye onaylı",
  },
  {
    emoji: "📐",
    iconBg: "var(--color-accent-purple-soft)",
    title: "Mimari & Statik Proje",
    subtitle: "DWG veya PDF",
  },
  {
    emoji: "🔬",
    iconBg: "var(--color-primary-soft)",
    title: "Zemin Etüt Raporu",
    subtitle: "Jeoteknik rapor",
  },
  {
    emoji: "🛡",
    iconBg: "var(--color-success-tint)",
    title: "Teminat Mektubu",
    subtitle: "Banka teminatı",
  },
];

export const PROJECT_DOCUMENTS_TITLE = "📎 Proje Belgeleri";

export const PROJECT_DOCUMENTS_NOTE =
  "Belge yükleme yakında eklenecek — proje oluşturduktan sonra belgeleri yükleyebileceksiniz.";

export const PROJECT_DOCUMENTS_DROP_TITLE =
  "Diğer proje belgelerini yükleyebileceksiniz";

export const PROJECT_DOCUMENTS_DROP_SUBTITLE =
  "İzin belgeleri, sigorta poliçesi, protokoller vb.";

export const PROJECT_DOCUMENTS_SOON_TITLE = "Belge yükleme yakında (P1.1b)";
