import { Button } from "@/components/ui";

interface FormActionsProps {
  /** İptal → formun liste/detay rotasına döner. */
  onCancel: () => void;
  /** Taslak Kaydet → is_draft:true. */
  onSaveDraft: () => void;
  /** Birincil eylem → is_draft:false. */
  onSubmit: () => void;
  /** Birincil buton metni: "Projeyi Oluştur" / "Şantiyeyi Oluştur". */
  submitLabel: string;
  isPending?: boolean;
  /**
   * `"end"` (varsayılan) üçlüyü sağa yaslar — proje formu (mockup satır 212).
   * `"split"` şeridi `space-between` yapar — şantiye formu (mockup satır 219).
   */
  variant?: "end" | "split";
}

/**
 * Paylaşılan alt eylem şeridi: İptal · Taslak Kaydet · {submitLabel}.
 * Sunum bileşeni — durum ve gönderim çağıran görünümdedir.
 */
export function FormActions({
  onCancel,
  onSaveDraft,
  onSubmit,
  submitLabel,
  isPending,
  variant = "end",
}: FormActionsProps) {
  const className =
    variant === "split" ? "pf-actions pf-actions--split" : "pf-actions";

  return (
    <div className={className}>
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
        {submitLabel}
      </Button>
    </div>
  );
}
