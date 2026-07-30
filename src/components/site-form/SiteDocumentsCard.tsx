import { DocumentsPlaceholderCard } from "@/components/form-shell";

import {
  SITE_DOCUMENTS,
  SITE_DOCUMENTS_DROP_SUBTITLE,
  SITE_DOCUMENTS_DROP_TITLE,
  SITE_DOCUMENTS_NOTE,
  SITE_DOCUMENTS_SOON_TITLE,
  SITE_DOCUMENTS_TITLE,
} from "./document-items";

/**
 * 📎 Şantiye Belgeleri (mockup satır 177–217) — salt yüzey.
 * Izgara üç sütundur (satır 179); paylaşılan kart `columns={3}` ile kurulur.
 * Yükleme kodu bu dilimde YAZILMAZ (spec §4.6, plan TZ-7).
 */
export function SiteDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
      title={SITE_DOCUMENTS_TITLE}
      note={SITE_DOCUMENTS_NOTE}
      items={SITE_DOCUMENTS}
      dropTitle={SITE_DOCUMENTS_DROP_TITLE}
      dropSubtitle={SITE_DOCUMENTS_DROP_SUBTITLE}
      soonTitle={SITE_DOCUMENTS_SOON_TITLE}
      columns={3}
    />
  );
}
