import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import "./error-card.css";

/**
 * Planlama modülü hata kartı — başlık + açıklama + "Tekrar dene".
 *
 * Kaynak (projedesign/, üçünde de aynı çizim):
 *   Planlama - Panel.dc.html:424-431          "Panel verisi alınamadı"
 *   Planlama - Birim Oran Kataloğu.dc.html:374-380   "Katalog yüklenemedi"
 *   Planlama - Adam-Saat Bütçesi.dc.html:490-497      "İş kalemleri alınamadı"
 *
 * `ui/alert` KULLANILMADI: o primitive 4px sol şeritli, farklı zeminli bir
 * bilgi kutusudur; bu kart tam kenarlıklı ve eylem düğmelidir.
 */
export interface ErrorCardProps {
  title: string;
  description?: React.ReactNode;
  onRetry: () => void;
  /** Yeniden deneme sürerken düğme kapanır ve `aria-busy` taşır. */
  retrying?: boolean;
  retryLabel?: string;
  className?: string;
}

export function ErrorCard({
  title,
  description,
  onRetry,
  retrying = false,
  retryLabel = "Tekrar dene",
  className,
}: ErrorCardProps) {
  return (
    <div role="alert" className={cx("ev-error-card", className)}>
      <div className="ev-error-card__head">
        {/* P:427 — 17px daire + ünlem, #ef4444 */}
        <AlertIcon className="ev-error-card__icon" width={17} height={17} />
        <span className="ev-error-card__title">{title}</span>
      </div>
      {description != null && <div className="ev-error-card__description">{description}</div>}
      <Button
        variant="secondary"
        size="sm"
        className="ev-error-card__retry"
        onClick={onRetry}
        disabled={retrying}
        aria-busy={retrying || undefined}
      >
        {retryLabel}
      </Button>
    </div>
  );
}
