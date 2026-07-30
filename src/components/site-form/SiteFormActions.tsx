import { FormActions } from "@/components/form-shell";
import { Checkbox } from "@/components/ui";
import { pendingModuleLabel } from "@/lib/pending-modules";

interface SiteFormActionsProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isPending?: boolean;
}

/**
 * Alt eylem şeridi (mockup satır 219–229): solda edilgen "poz dağılımı"
 * kutucuğu, sağda İptal · Taslak Kaydet · Şantiyeyi Oluştur.
 *
 * Kutucuk mockup'ta işaretli görünür; burada **disabled + işaretsizdir**
 * (spec §4.7) — sözleşme modülü gelmeden yönlendirme yapılamaz.
 */
export function SiteFormActions({
  onCancel,
  onSaveDraft,
  onSubmit,
  isPending,
}: SiteFormActionsProps) {
  return (
    <FormActions
      variant="split"
      leading={
        <Checkbox
          size="lg"
          disabled
          checked={false}
          readOnly
          title={pendingModuleLabel("contracts")}
          label="Oluşturduktan sonra poz dağılımı ekranına git"
        />
      }
      onCancel={onCancel}
      onSaveDraft={onSaveDraft}
      onSubmit={onSubmit}
      submitLabel="Şantiyeyi Oluştur"
      isPending={isPending}
    />
  );
}
