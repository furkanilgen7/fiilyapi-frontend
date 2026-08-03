import { Button } from "@/components/ui";

import type { PaymentActionKind } from "./status-actions";

/**
 * F-TH T4 · İşveren `ProgressPaymentStatusActions` (P7 T4) içindeki buton
 * JSX'i BURAYA çıkarıldı — Taşeron tarafı AYNI buton kümesini/etiketlerini/
 * stilini PAYLAŞIR (brief §Emsal: "ONU KOPYALAMA, PAYLAŞ"). Bu bileşen SAF
 * sunumdur: mutasyon/hook/modal durumu çağıran tarafta kalır (her ekranın
 * kendi izin modülü + reddetme gerekçesi kuralı — zorunlu/isteğe bağlı —
 * FARKLI olabilir), yalnız hangi butonun hangi etiket/varyantla/`disabled`
 * durumuyla basılacağı burada TEK yerde yaşar.
 */
export interface PaymentActionButtonsProps {
  status: "draft" | "pending_approval" | "approved" | "paid";
  actions: PaymentActionKind[];
  anyPending: boolean;
  isSubmitPending: boolean;
  isApprovePending: boolean;
  isMarkPaidPending: boolean;
  onSubmit: () => void;
  onOpenReject: () => void;
  onApprove: () => void;
  onOpenUnapprove: () => void;
  onMarkPaid: () => void;
}

export function PaymentActionButtons({
  status,
  actions,
  anyPending,
  isSubmitPending,
  isApprovePending,
  isMarkPaidPending,
  onSubmit,
  onOpenReject,
  onApprove,
  onOpenUnapprove,
  onMarkPaid,
}: PaymentActionButtonsProps) {
  return (
    <>
      {actions.includes("submit") && (
        <Button variant="primary" onClick={onSubmit} disabled={anyPending}>
          {isSubmitPending ? "Gönderiliyor…" : "Onaya Gönder"}
        </Button>
      )}

      {actions.includes("reject") && actions.includes("approve") && (
        <>
          <Button variant="danger" onClick={onOpenReject} disabled={anyPending}>
            Reddet
          </Button>
          <Button variant="success" onClick={onApprove} disabled={anyPending}>
            {isApprovePending ? "Onaylanıyor…" : "Onayla"}
          </Button>
        </>
      )}

      {status === "approved" && (
        <>
          {actions.includes("unapprove") && (
            <Button variant="ghost" onClick={onOpenUnapprove} disabled={anyPending}>
              Onayı Geri Al
            </Button>
          )}
          {actions.includes("markPaid") && (
            <Button variant="success" onClick={onMarkPaid} disabled={anyPending}>
              {isMarkPaidPending ? "İşaretleniyor…" : "Ödendi İşaretle"}
            </Button>
          )}
        </>
      )}

      {/* `paid` durumunda hiçbir aksiyon yoktur — yukarıdaki dallardan hiçbiri
          eşleşmez, alan boş kalır. */}
    </>
  );
}
