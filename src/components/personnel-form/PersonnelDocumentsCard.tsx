import Link from "next/link";

import { DocumentsPlaceholderCard } from "@/components/form-shell";
import { WarningTriangleIcon, inlineSymbolProps } from "@/components/ui/icons";
import { routes } from "@/lib/routes";

import { PENDING_DOCUMENTS } from "./constants";
import {
  PERSONNEL_DOCUMENTS,
  PERSONNEL_DOCUMENTS_DROP_SUBTITLE,
  PERSONNEL_DOCUMENTS_DROP_TITLE,
  PERSONNEL_DOCUMENTS_NOTE,
  PERSONNEL_DOCUMENTS_TITLE,
  PERSONNEL_DOCUMENTS_WARNING_AFTER_LINK,
  PERSONNEL_DOCUMENTS_WARNING_BEFORE_LINK,
  PERSONNEL_DOCUMENTS_WARNING_LINK,
  PERSONNEL_DOCUMENTS_WARNING_STRONG,
} from "./document-items";

/**
 * 📎 Belgeler (mockup satır 122–201) — altı kutu + genel sürükle-bırak +
 * uyarı kutusu. Izgara İKİ sütundur (124).
 *
 * Yükleme kodu bu dilimde YAZILMAZ. Uyarı kutusundaki "Belge Takibi" bağlantısı
 * ETKİNDİR — hedefi `/personel/belgeler` (genel BT ekranı, `HrDocumentsView`);
 * bu form BAĞLAM taşımaz (formda henüz kaydedilmemiş personel için özel bir
 * kayıt yok), ekran TÜM personeli listeler.
 *
 * M5_1 kayıt #178: eskiden "ekran henüz eklenmedi" diye edilgen basılıyordu —
 * bu gerekçe BAYATTI, rota GERÇEKTEN var (`routes.personnel.documents()`).
 */
export function PersonnelDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
        title={PERSONNEL_DOCUMENTS_TITLE}
        note={PERSONNEL_DOCUMENTS_NOTE}
        items={PERSONNEL_DOCUMENTS}
        dropTitle={PERSONNEL_DOCUMENTS_DROP_TITLE}
        dropSubtitle={PERSONNEL_DOCUMENTS_DROP_SUBTITLE}
      soonTitle={PENDING_DOCUMENTS}
      columns={2}
      // 195-200 — uyarı kutusu belge kartının İÇİNDEDİR.
      footer={
        <div className="pnf-warning">
          <p className="pnf-warning__text">
            {/* 195 `⚠` — glif değil ikon (F-SEM); kalın metnin İÇİNDE durur. */}
            <strong>
              <WarningTriangleIcon {...inlineSymbolProps} /> {PERSONNEL_DOCUMENTS_WARNING_STRONG}
            </strong>
            {PERSONNEL_DOCUMENTS_WARNING_BEFORE_LINK}
            {/* Genel BT ekranına gider — bu formdan bağlam TAŞIMAZ (M5_1 #178). */}
            <Link href={routes.personnel.documents()} className="pnf-warning__link">
              {PERSONNEL_DOCUMENTS_WARNING_LINK}
            </Link>
            {PERSONNEL_DOCUMENTS_WARNING_AFTER_LINK}
          </p>
        </div>
      }
    />
  );
}
