import { hasAtLeast, type AccessLevel } from "@/lib/auth/permissions";

import type { PaymentLifecycleStatus } from "./status";

/** Durum aksiyon butonlarının türleri — İşveren (`ProgressPaymentStatusActions`)
 * ve Taşeron tarafının ORTAK kümesi (F-TH T1 §4 paylaşım kararı). */
export type PaymentActionKind = "submit" | "reject" | "approve" | "unapprove" | "markPaid";

/**
 * Durum + izin seviyesi → izinli aksiyon kümesi. `ProgressPaymentStatusActions.tsx`
 * (P7 T4) içindeki koşullardan çıkarıldı — backend `transitions.py` §7
 * tablosunun görünürlük yansıması. Güvenlik sınırı HER ZAMAN backend'dedir;
 * bu yalnız çalışmayacak butonu göstermemek içindir.
 *
 * draft → submit (≥draft) · pending_approval → reject+approve (≥approve) ·
 * approved → unapprove (≥admin) + markPaid (≥approve) · paid → (boş).
 */
export function permittedPaymentActions(
  status: PaymentLifecycleStatus,
  level: AccessLevel | undefined,
): PaymentActionKind[] {
  switch (status) {
    case "draft":
      return hasAtLeast(level, "draft") ? ["submit"] : [];
    case "pending_approval":
      return hasAtLeast(level, "approve") ? ["reject", "approve"] : [];
    case "approved": {
      const actions: PaymentActionKind[] = [];
      if (hasAtLeast(level, "admin")) actions.push("unapprove");
      if (hasAtLeast(level, "approve")) actions.push("markPaid");
      return actions;
    }
    case "paid":
      return [];
  }
}
