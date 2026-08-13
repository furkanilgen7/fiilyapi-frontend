import { FormActions } from "@/components/form-shell";
import { Checkbox } from "@/components/ui";

import { PENDING_DRAFT_PUBLISHED, PENDING_SGK, SUBMIT_LABEL } from "./constants";

interface PersonnelFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  /**
   * "Taslak Kaydet" → `is_draft: true` (spec K4). YAYINLANMIŞ bir kaydın
   * düzenlenmesinde verilmez: buton devre-dışı basılır ve gerekçesini taşır
   * (`FormActions.draftPlaceholderTitle`) — yayındaki kayıt formdan sessizce
   * taslağa DÜŞMEZ.
   */
  onSaveDraft?: () => void;
  isPending?: boolean;
  /** F-PT2 T3 — düzenleme kipinde "Kaydet" / taslakta "Yayına Al". */
  submitLabel?: string;
}

/**
 * Alt eylem şeridi (mockup satır 204–214): solda SGK kutucuğu, sağda
 * İptal · Taslak Kaydet · Personeli Kaydet.
 *
 * • Kutucuk mockup'ta İŞARETLİ görünür (206); burada **devre-dışı ve
 *   işaretsizdir** — SGK bildirim modülü yok, işaretli göstermek olmayan bir
 *   otomasyonu vaat etmek olurdu.
 */
export function PersonnelFormActions({
  onCancel,
  onSubmit,
  onSaveDraft,
  isPending,
  submitLabel = SUBMIT_LABEL,
}: PersonnelFormActionsProps) {
  return (
    <FormActions
      variant="split"
      leading={
        <Checkbox
          size="lg"
          disabled
          checked={false}
          readOnly
          title={PENDING_SGK}
          label="Kayıt sonrası SGK işe giriş bildirgesi otomatik oluşturulsun"
        />
      }
      onCancel={onCancel}
      onSaveDraft={onSaveDraft}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      pendingLabel="Kaydediliyor…"
      isPending={isPending}
      draftPlaceholderTitle={PENDING_DRAFT_PUBLISHED}
    />
  );
}
