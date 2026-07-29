import { Button } from "@/components/ui";

interface FormActionsProps {
  /** İptal → /projeler (§4.9). */
  onCancel: () => void;
  /** Taslak Kaydet → is_draft:true (§5). */
  onSaveDraft: () => void;
  /** Projeyi Oluştur → is_draft:false. */
  onSubmit: () => void;
  isPending?: boolean;
}

/**
 * Alt eylem şeridi: İptal · Taslak Kaydet · Projeyi Oluştur (mockup satır 212–216).
 * Sunum bileşeni — durum ve gönderim ProjectCreateView'da.
 */
export function FormActions({
  onCancel,
  onSaveDraft,
  onSubmit,
  isPending,
}: FormActionsProps) {
  return (
    <div className="pf-actions">
      <Button
        variant="secondary"
        className="pf-action pf-action--cancel"
        onClick={onCancel}
        disabled={isPending}
      >
        İptal
      </Button>
      <Button
        variant="secondary"
        className="pf-action pf-action--draft"
        onClick={onSaveDraft}
        disabled={isPending}
      >
        Taslak Kaydet
      </Button>
      <Button
        variant="primary"
        className="pf-action pf-action--submit"
        onClick={onSubmit}
        disabled={isPending}
      >
        Projeyi Oluştur
      </Button>
    </div>
  );
}
