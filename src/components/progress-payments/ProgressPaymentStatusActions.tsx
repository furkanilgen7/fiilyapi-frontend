"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Alert, Button, Field, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { Modal } from "@/components/settings/Modal";
import { backendErrorMessage } from "@/lib/api/error-message";
import {
  useApproveProgressPayment,
  useMarkProgressPaymentPaid,
  useRejectProgressPayment,
  useSubmitProgressPayment,
  useUnapproveProgressPayment,
} from "@/lib/api/hooks/useProgressPaymentMutations";
import { PROGRESS_PAYMENT_QUERY_KEY, type ProgressPaymentDetail } from "@/lib/api/hooks/useProgressPayments";
import { BackendError } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
// Ayarlar modal/form kanonu birebir izlenir (SectionFormModal/BoqItemFormModal
// deseniyle ayni): settings-form sinifi settings.css'ten, ConfirmDialog yikici
// aksiyonlar icin paylasilan onay diyalogu.
import "@/components/settings/settings.css";
import "./progress-payment-detail.css";
import { PaymentActionButtons } from "./shared/PaymentActionButtons";
import { permittedPaymentActions } from "./shared/status-actions";

export interface ProgressPaymentStatusActionsProps {
  detail: ProgressPaymentDetail;
}

/**
 * Ekran 15 başlık aksiyon alanı (P7 T4). Buton kümesi backend
 * `transitions.py` §7 tablosundan türetilir — bu aksiyonların hiçbiri
 * mockup'ta YOK (kullanıcı kararı S1, brief §Bağlam): buton stili/yerleşimi
 * mockup'ın diğer butonlarını taklit eder, küme durum makinesinden gelir.
 *
 * Görünürlük = (durum eşleşmesi) VE (izin seviyesi). Güvenlik sınırı HER
 * ZAMAN backend'dedir; buradaki kapı yalnız çalışmayacak buton göstermemek
 * içindir — tabloda olmayan her geçiş 409'dur.
 */
export function ProgressPaymentStatusActions({ detail }: ProgressPaymentStatusActionsProps) {
  const { level } = useModulePermission("progress_payments");
  const queryClient = useQueryClient();

  const submit = useSubmitProgressPayment();
  const approve = useApproveProgressPayment();
  const reject = useRejectProgressPayment();
  const markPaid = useMarkProgressPaymentPaid();
  const unapprove = useUnapproveProgressPayment();

  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [unapproveOpen, setUnapproveOpen] = useState(false);

  // Ayni anda tek istek: herhangi bir aksiyon uçarken TÜM butonlar kilitlenir
  // (brief §Aksiyon davranışları — çift tıkla iki istek gitmemeli; çakışan
  // durum geçişlerinin ayni anda tetiklenmesini de engeller).
  const anyPending =
    submit.isPending ||
    approve.isPending ||
    reject.isPending ||
    markPaid.isPending ||
    unapprove.isPending;

  // 409 — geçersiz durum geçişi (ör. başkası aynı anda onaylamış): Türkçe
  // mesaj basılır VE detay sorgusu tazelenir ki ekran gerçek duruma otursun
  // (brief §Hata gösterimi). Diğer statüler (403/422/vs.) yalnız mesaj basar.
  function handleError(err: unknown, fallback: string) {
    setError(backendErrorMessage(err, fallback));
    if (err instanceof BackendError && err.status === 409) {
      queryClient.invalidateQueries({ queryKey: [PROGRESS_PAYMENT_QUERY_KEY, detail.id] });
    }
  }

  function handleSubmit() {
    setError(null);
    submit.mutate(detail.id, { onError: (err) => handleError(err, "Onaya gönderilemedi.") });
  }

  function handleApprove() {
    setError(null);
    approve.mutate(detail.id, { onError: (err) => handleError(err, "Onaylanamadı.") });
  }

  function handleMarkPaid() {
    setError(null);
    markPaid.mutate(detail.id, {
      onError: (err) => handleError(err, "Ödendi olarak işaretlenemedi."),
    });
  }

  function openReject() {
    setError(null);
    setRejectReason("");
    setRejectOpen(true);
  }

  function confirmReject() {
    setError(null);
    const trimmed = rejectReason.trim();
    // Gövde İSTEĞE BAĞLIDIR (RejectBody.reason nullable) — boş bırakılırsa
    // gövdesiz çağrılır (brief §Aksiyon davranışları).
    reject.mutate(
      { paymentId: detail.id, body: trimmed ? { reason: trimmed } : undefined },
      {
        onSuccess: () => setRejectOpen(false),
        onError: (err) => handleError(err, "Reddedilemedi."),
      },
    );
  }

  function confirmUnapprove() {
    setError(null);
    unapprove.mutate(detail.id, {
      onSuccess: () => setUnapproveOpen(false),
      onError: (err) => handleError(err, "Onay geri alınamadı."),
    });
  }

  // Görünürlük kapısı `shared/status-actions.ts`ten (F-TH T1 paylaşım kararı —
  // taşeron tarafı AYNI durum→aksiyon eşlemesini kullanır). Güvenlik sınırı
  // HER ZAMAN backend'dedir; bu yalnız çalışmayacak butonu göstermemek içindir.
  const actions = permittedPaymentActions(detail.status, level);

  return (
    <div className="pp-detail__actions" data-testid="pp-detail-actions">
      <PaymentActionButtons
        status={detail.status}
        actions={actions}
        anyPending={anyPending}
        isSubmitPending={submit.isPending}
        isApprovePending={approve.isPending}
        isMarkPaidPending={markPaid.isPending}
        onSubmit={handleSubmit}
        onOpenReject={openReject}
        onApprove={handleApprove}
        onOpenUnapprove={() => setUnapproveOpen(true)}
        onMarkPaid={handleMarkPaid}
      />

      {error && (
        <Alert variant="danger" className="pp-detail__action-error" data-testid="pp-detail-action-error">
          {error}
        </Alert>
      )}

      {rejectOpen && (
        <Modal
          title="Hakedişi Reddet"
          onClose={() => setRejectOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={reject.isPending}>
                Vazgeç
              </Button>
              <Button variant="danger" onClick={confirmReject} disabled={reject.isPending}>
                {reject.isPending ? "Reddediliyor…" : "Reddet"}
              </Button>
            </>
          }
        >
          <div className="settings-form">
            <Field
              label="Gerekçe (isteğe bağlı)"
              hint="Gerekçe hakedişin hiçbir alanına kaydedilmez, yalnız denetim günlüğüne yazılır."
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                />
              )}
            </Field>
          </div>
        </Modal>
      )}

      {unapproveOpen && (
        <ConfirmDialog
          title="Onayı Geri Al"
          message='Hakedişin onayı geri alınacak, durum yeniden "Onay Bekliyor"a döner. Devam edilsin mi?'
          confirmLabel="Onayı Geri Al"
          danger
          isPending={unapprove.isPending}
          onConfirm={confirmUnapprove}
          onClose={() => setUnapproveOpen(false)}
        />
      )}
    </div>
  );
}
