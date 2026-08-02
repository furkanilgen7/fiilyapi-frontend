import { DocumentsPlaceholderCard } from "@/components/form-shell";

import {
  SECTION_DOCUMENTS,
  SECTION_DOCUMENTS_DROP_SUBTITLE,
  SECTION_DOCUMENTS_DROP_TITLE,
  SECTION_DOCUMENTS_NOTE,
  SECTION_DOCUMENTS_SOON_TITLE,
  SECTION_DOCUMENTS_TITLE,
} from "./document-items";

/** 📎 Bölüm Belgeleri (mockup F214–233) — salt yüzey, üç sütun (F216). */
export function DocumentsCard() {
  return (
    <DocumentsPlaceholderCard
      title={SECTION_DOCUMENTS_TITLE}
      note={SECTION_DOCUMENTS_NOTE}
      items={SECTION_DOCUMENTS}
      dropTitle={SECTION_DOCUMENTS_DROP_TITLE}
      dropSubtitle={SECTION_DOCUMENTS_DROP_SUBTITLE}
      soonTitle={SECTION_DOCUMENTS_SOON_TITLE}
      columns={3}
    />
  );
}
