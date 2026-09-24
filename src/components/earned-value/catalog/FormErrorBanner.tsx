import type { FieldControlProps } from "@/components/ui";
import { WarningTriangleIcon } from "@/components/ui/icons";

/**
 * `Field` bir KONTROL için bağlama props'u üretir; seçim GRUBU (çipler,
 * segment) için `aria-required` rol=group'ta geçersizdir — atılır, gerisi
 * (id, describedby, invalid) grup kabına yayılır. Etiket tipografisi böylece
 * yalnız `ui/field`de kalır (field-adoption bekçisi).
 */
export function groupProps(control: FieldControlProps): Omit<FieldControlProps, "aria-required"> {
  return {
    id: control.id,
    ...(control["aria-describedby"] ? { "aria-describedby": control["aria-describedby"] } : {}),
    ...(control["aria-invalid"] ? { "aria-invalid": control["aria-invalid"] } : {}),
  };
}

interface FormErrorBannerProps {
  /** Kalın öncü — KAT:243 "1 alan eksik." · M6:245 "3 alan hatalı." */
  lead?: string;
  text: string;
}

/**
 * KAT:243 / M6:245 — form içi hata bandı. Mockup'taki çıplak "⚠" glifi yerine
 * `ui/icons` SVG'si (symbol-subset-guard: çıplak U+26A0 yasak).
 */
export function FormErrorBanner({ lead, text }: FormErrorBannerProps) {
  return (
    <div className="ev-cat-form-alert" role="alert">
      <WarningTriangleIcon />
      <span>
        {lead && <strong>{lead}</strong>} {text}
      </span>
    </div>
  );
}
