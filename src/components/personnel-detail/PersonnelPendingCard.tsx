import Link from "next/link";
import type { ReactNode } from "react";

export interface PersonnelPendingCardProps {
  title: string;
  /** Kart başlığının sağındaki GERÇEK bağlantı (yalnız Puantaj Özeti — "Tümü →"). */
  headerLink?: { href: string; label: string };
  /** Devre-dışı gövde içeriğinin görünür gerekçesi. */
  reason: string;
  testId: string;
  children?: ReactNode;
}

/**
 * F-PT2 T3 · PD'nin 4 pending kartının (Puantaj Özeti · İzin & Haklar ·
 * Proje Geçmişi · Belgeler) ORTAK kabuğu — üst kural gereği kart SİLİNMEZ,
 * başlık basılır, gövde devre-dışı + GÖRÜNÜR gerekçelidir.
 */
export function PersonnelPendingCard({
  title,
  headerLink,
  reason,
  testId,
  children,
}: PersonnelPendingCardProps) {
  return (
    <section className="pd-card" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <div className="pd-card__head">
        <h2 className="pd-card__title" id={`${testId}-title`}>
          {title}
        </h2>
        {headerLink && (
          <Link href={headerLink.href} className="pd-card__link">
            {headerLink.label}
          </Link>
        )}
      </div>
      {children}
      <div className="pd-card__pending" aria-disabled="true">
        <p className="pd-card__pending-text">{reason}</p>
      </div>
    </section>
  );
}
