import { Button } from "@/components/ui";
import { DOCUMENT_ALERT_PENDING_REASON } from "./personnel-list-labels";
import "./personnel-list.css";

// P 80-86 · Uyarı bandı — İK-Belge takibine PENDING. Mockup'ın "4 personelin
// sağlık raporu…" cümlesi SUNUCUDA karşılığı olmayan sahte bir sayıdır; bu
// ekran uydurma sayı basmaz. Bant SİLİNMEZ, görünür gerekçeyle kalır.
export function PersonnelDocumentAlertBanner() {
  return (
    <div className="personel-alert" data-testid="personel-document-alert">
      <span className="personel-alert__icon" aria-hidden="true">
        ⚠️
      </span>
      <p className="personel-alert__text">{DOCUMENT_ALERT_PENDING_REASON}</p>
      <Button
        variant="primary"
        size="sm"
        className="personel-alert__action"
        disabled
        title={DOCUMENT_ALERT_PENDING_REASON}
      >
        Belgeleri Gör →
      </Button>
    </div>
  );
}
