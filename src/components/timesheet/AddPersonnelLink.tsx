import Link from "next/link";

import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

export interface AddPersonnelLinkProps {
  /** Kaydetme/İptal sonrası dönülecek uygulama içi yol (sorgu dizesi dâhil). */
  returnTo: string;
  /** `"secondary"` üst şerit, `"primary"` boş-durum yönlendirmesi. */
  variant?: "secondary" | "primary";
}

/**
 * "Personel Ekle" girişi — mockup'ta YOKTUR; spec §4'ün S2(a) kararına dâhil
 * edilmiş ONAYLI türetimdir. Gerekçe: matris satırlarını `GET /personnel`
 * besler, UI'dan personel eklenemezse matris canlıda sonsuza dek boş kalır.
 *
 * Görünürlük çağıranın işidir: `personnel:full` yoksa HİÇ basılmaz.
 */
export function AddPersonnelLink({ returnTo, variant = "secondary" }: AddPersonnelLinkProps) {
  const href = routes.personnel.new({ returnTo });
  return (
    <Link href={href} className={cx("btn", `btn--${variant}`, "btn--md")}>
      Personel Ekle
    </Link>
  );
}
