import Link from "next/link";

import { Button } from "@/components/ui";
import { buildDocumentAlertText, HR_DOCUMENTS_ROUTE } from "./personnel-list-labels";
import "./personnel-list.css";

export interface PersonnelDocumentAlertBannerProps {
  /** `GET /hr/documents/summary` sayaçları; `undefined` ⇒ yükleniyor/hata. */
  counts?: { expired: number; expiring: number };
}

/**
 * P 80-86 · uyarı bandı — F-İK T2'den beri GERÇEK: metin `GET
 * /hr/documents/summary`in `expired`/`expiring` sayaçlarından kurulur.
 *
 * ⚠️ ŞEF KARARI: sunucu BELGE sayısı verir; mockup'ın "4 personelin sağlık
 * raporu…" cümlesindeki PERSONEL sayısının sunucuda karşılığı yoktur ve
 * UYDURULMAZ (`buildDocumentAlertText`).
 *
 * Bant KRİTİK DEĞİLDİR: özet ucu hata verirse (ya da iki sayaç da 0 ise)
 * sessizce düşer — ekranın geri kalanı bundan etkilenmez.
 */
export function PersonnelDocumentAlertBanner({ counts }: PersonnelDocumentAlertBannerProps) {
  const text = counts ? buildDocumentAlertText(counts) : null;
  if (!text) return null;

  return (
    <div className="personel-alert" data-testid="personel-document-alert">
      <span className="personel-alert__icon" aria-hidden="true">
        ⚠️
      </span>
      <p className="personel-alert__text">{text}</p>
      {/* 85 — GERÇEK link (ekran T5'te yazılır, rota tek sabitten gelir) */}
      <Link href={HR_DOCUMENTS_ROUTE}>
        <Button variant="primary" size="sm" className="personel-alert__action">
          Belgeleri Gör →
        </Button>
      </Link>
    </div>
  );
}
