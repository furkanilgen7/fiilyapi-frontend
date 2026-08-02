/**
 * Bölüm Belgeleri kartının içeriği — yer tutucu (mockup F214–233).
 * Yüzey `form-shell/DocumentsPlaceholderCard`'dan gelir (brief §Mockup'ta olup
 * backend'i OLMAYAN kartlar madde 4: "diğer tam-sayfa formlarla tutarlı" —
 * `site-form/document-items.ts` deseniyle aynı, alt sürükle-bırak satırı
 * DAHİL). Bu dilimde yükleme YOKTUR.
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";
import { pendingModuleLabel } from "@/lib/pending-modules";

/** İkon zeminleri mockup renklerinden (F219, F224, F229) — hepsi MEVCUT token. */
export const SECTION_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📐",
    iconBg: "var(--color-accent-purple-soft)", // #ede9fe (F219)
    title: "Uygulama Projesi",
    subtitle: "Bu faza ait çizimler",
  },
  {
    emoji: "📋",
    iconBg: "var(--color-primary-soft)", // #dbeafe (F224)
    title: "Metraj Cetveli",
    subtitle: "Poz miktarları hesabı",
  },
  {
    emoji: "⛑",
    iconBg: "var(--color-warning-soft)", // #fef3c7 (F229)
    title: "İSG Faz Planı",
    subtitle: "Faza özel risk analizi",
  },
];

export const SECTION_DOCUMENTS_TITLE = "📎 Bölüm Belgeleri";

export const SECTION_DOCUMENTS_NOTE = pendingModuleLabel("documents");

export const SECTION_DOCUMENTS_DROP_TITLE = "Diğer bölüm belgelerini sürükleyin";

export const SECTION_DOCUMENTS_DROP_SUBTITLE = "Kalite kontrol tutanağı, teslim tutanağı vb.";

export const SECTION_DOCUMENTS_SOON_TITLE = pendingModuleLabel("documents");
