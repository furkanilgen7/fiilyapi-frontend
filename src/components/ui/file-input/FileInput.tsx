import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./file-input.css";

export type FileInputStatus = "default" | "error";

// DOM'un kendi `size`/`type` oznitelikleri gizlenir: bu primitive YALNIZ dosya
// secimi icindir ve olcusu `.f-in` ailesinden gelir.
export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  status?: FileInputStatus;
}

/**
 * Dosya secimi kontrolu — `Input`/`Select` ile ayni `.f-in` cerceve/ic bosluk
 * ailesinden.
 *
 * Neden ayri primitive: `type="file"` kontrolun ic parcasi (dosya secme
 * dugmesi) `::file-selector-button` ile ayrica bicimlenir; `Input`a bir dal
 * daha eklemek yerine kendi dosyasinda tutulur. Ekranlar ham
 * `<input type="file">` YAZMAZ (form kontrolleri primitive kurali).
 *
 * `multiple` bilerek acilmaz: backend ucu TEK dosya alir (spec §3).
 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ status = "default", className, ...rest }, ref) => (
    <input
      ref={ref}
      type="file"
      className={cx("file-input", status !== "default" && `file-input--${status}`, className)}
      {...rest}
    />
  ),
);

FileInput.displayName = "FileInput";
