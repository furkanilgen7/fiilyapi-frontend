import { UserIcon } from "@/components/ui/icons";

/**
 * Formen bandı — İ:150-155; `topBanner` yuvasında (S3: başlığın altı, kartlardan
 * önce). Metin §3.14 G10 (Ek Formlar "(e)"); 👷 yerine SVG (F-SEM).
 */
export function ForemanBand() {
  return (
    <div className="ev-diary-foreman" role="note">
      <UserIcon aria-hidden="true" />
      <span>
        <b>Formen görünümü.</b> Miktar satırları, işçi / taşeron sayıları ve hava düzenlenebilir; Saat
        Dağıtımı mühendis tarafından doldurulur. Gönderim mühendiste.
      </span>
    </div>
  );
}
