import { FormActions } from "@/components/form-shell";
import { Checkbox } from "@/components/ui";

import { PENDING_DRAFT, PENDING_SGK, SUBMIT_LABEL } from "./constants";

interface PersonnelFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isPending?: boolean;
}

/**
 * Alt eylem şeridi (mockup satır 204–214): solda SGK kutucuğu, sağda
 * İptal · Taslak Kaydet · Personeli Kaydet.
 *
 * • Kutucuk mockup'ta İŞARETLİ görünür (206); burada **devre-dışı ve
 *   işaretsizdir** — SGK bildirim modülü yok, işaretli göstermek olmayan bir
 *   otomasyonu vaat etmek olurdu.
 * • "Taslak Kaydet" (211) devre-dışıdır: `POST /personnel` taslak taşımaz.
 *   `FormActions` `onSaveDraft` verilmediğinde butonu HİÇ basmaz, bu yüzden
 *   buton burada elle basılır (mockup'tan öğe SİLİNMEZ kuralı).
 */
export function PersonnelFormActions({
  onCancel,
  onSubmit,
  isPending,
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
      onSaveDraft={undefined}
      onSubmit={onSubmit}
      submitLabel={SUBMIT_LABEL}
      pendingLabel="Kaydediliyor…"
      isPending={isPending}
      draftPlaceholderTitle={PENDING_DRAFT}
    />
  );
}
