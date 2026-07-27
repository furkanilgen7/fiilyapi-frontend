import { useId, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./field.css";

/**
 * Field'in kontrole gecirdigi baglama props'lari.
 *
 * Tuketen ekran bunlari elle uretmez; `{...control}` diye yayar. Boylece
 * htmlFor/id eslesmesi, aria-describedby ve aria-invalid tek yerde ve
 * tutarli sekilde kurulur.
 */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

export type FieldSize = "md" | "lg";

export interface FieldProps {
  /** Etiket metni. Zorunluluk yildizi `required` ile eklenir, metne yazilmaz. */
  label: ReactNode;
  /** Zorunlu alan: gorsel `*` + kontrolde aria-required. */
  required?: boolean;
  /** Yardim metni (mockup `.hint`). aria-describedby ile kontrole baglanir. */
  hint?: ReactNode;
  /** Hata metni. Kontrole aria-invalid verir, describedby'a eklenir. */
  error?: ReactNode;
  /**
   * Etiket olcusu. "md" = kanon 12/600 #475569 (projedesign "Form - *" `.lbl`).
   * "lg" = Giris ekrani istisnasi: 13/600 #374151 (mockup Giris.dc.html).
   */
  size?: FieldSize;
  /** Etiket satirinin sagina yaslanan yardimci icerik (or. "Sifremi unuttum"). */
  labelAside?: ReactNode;
  className?: string;
  /**
   * Kontrolu ureten render prop. Slot yerine render prop secildi: markup
   * ekrandan ekrana degisiyor (Input, Select, textarea, ham input) ama
   * baglama davranisi ayni — cloneElement sihri olmadan tip guvenli kalir.
   */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Tum form alanlarinin ortak etiket/ipucu/hata katmani.
 *
 * Kanon: projedesign "Form - *.dc.html" ortak `<style>` blogu (`.lbl`, `.req`,
 * `.hint`). Ekranlar kendi `.*__label` kurallarini yazmaz.
 */
export function Field({
  label,
  required,
  hint,
  error,
  size = "md",
  labelAside,
  className,
  children,
}: FieldProps) {
  const uid = useId();
  const controlId = `${uid}-control`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const control: FieldControlProps = {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(required ? { "aria-required": true as const } : {}),
  };

  return (
    <div className={cx("field", size !== "md" && `field--${size}`, className)}>
      <span className="field__label-row">
        {/* Yildiz bilerek <label> DISINDA: etiketin erisilebilir adina (ve
            getByLabelText eslesmesine) sizmasin. Zorunluluk aria-required ile
            programatik olarak duyurulur. */}
        <label className="field__label" htmlFor={controlId}>
          {label}
        </label>
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
        {labelAside && <span className="field__aside">{labelAside}</span>}
      </span>
      {children(control)}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
