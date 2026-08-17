import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

import {
  PAYROLL_PERIOD_QUERY_KEY,
  PAYROLL_PERIODS_QUERY_KEY,
  type PayrollLineResponse,
} from "./usePayroll";

/**
 * F-BOR T2 · `/bordro` ekranının ÜÇ yazma ucu (BY:56 · BY:142-147 · BY:303).
 *
 * 🔴 Üçü de AYNI İKİ sorguyu tazeler: dönem DETAYI (satırlar + özet kartları)
 * ve dönem LİSTESİ (ay gezgininin durum bilgisi). Yalnız detayı tazelemek
 * gezginin durum etiketini bayat bırakırdı — onay/ödeme dönemin `status`unu
 * oynatır ve o alan liste satırında da vardır.
 */
export type PayrollLineUpdate = components["schemas"]["PayrollLineUpdate"];
export type PayrollPeriodApproveResult =
  components["schemas"]["PayrollPeriodApproveResult"];
export type PayrollPeriodPayResult = components["schemas"]["PayrollPeriodPayResult"];

function usePayrollInvalidator(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [PAYROLL_PERIOD_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [PAYROLL_PERIODS_QUERY_KEY] });
  };
}

export interface PayrollLineSplitInput {
  lineId: string;
  /** Banka payı — ham metin DEĞİL, ekranda ayrıştırılmış değer. */
  bankAmount: string;
  cashAmount: string;
}

/**
 * `PATCH /payroll/lines/{id}` — BY:142-147'deki iki `input`.
 *
 * 🔴 `bank_amount` ve `cash_amount` HER ZAMAN BİRLİKTE gönderilir (şema
 * açıklaması: "İkisi birlikte gönderilir"). Yalnız biri gönderilip öteki
 * sunucuya tamamlatılsaydı bölüşüm bir DOĞRULAMA değil bir HESAP olurdu ve
 * "gerisi elden mi, yoksa yanlış mı yazdım?" ayrımı kaybolurdu.
 *
 * 🔴 `gross_amount` (brüt override) BU EKRANDA GÖNDERİLMEZ: BY tablosunda
 * Brüt sütunu düz metindir (BY:139), `input` DEĞİLDİR. Alanı gövdeye eklemek
 * mockup'ta olmayan bir yazma yüzeyini icat etmek olurdu.
 */
export function useUpdatePayrollLineSplit(): UseMutationResult<
  PayrollLineResponse,
  Error,
  PayrollLineSplitInput
> {
  const invalidate = usePayrollInvalidator();
  return useMutation({
    mutationFn: async ({ lineId, bankAmount, cashAmount }) =>
      unwrap(
        await backendClient.PATCH("/payroll/lines/{line_id}", {
          params: { path: { line_id: lineId } },
          body: { bank_amount: bankAmount, cash_amount: cashAmount },
        }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * `POST /payroll/periods/{id}/approve` — 🔴 **BY:303 "Tümünü Onayla"**.
 * Şema açıklaması bu ucu ADIYLA o düğmeye bağlar ("BY 303 'Tümünü Onayla'").
 * Dönemi TEK ADIM ilerletir (`draft → pending_approval → approved`); üçüncü
 * çağrı 409'dur.
 *
 * Yanıttaki ÜÇ atlama sayacı (`skipped_uncomputed` / `skipped_excluded` /
 * `skipped_already_approved`) ekranda GÖSTERİLİR — sessiz atlama yoktur.
 */
export function useApprovePayrollPeriod(): UseMutationResult<
  PayrollPeriodApproveResult,
  Error,
  string
> {
  const invalidate = usePayrollInvalidator();
  return useMutation({
    mutationFn: async (periodId) =>
      unwrap(
        await backendClient.POST("/payroll/periods/{period_id}/approve", {
          params: { path: { period_id: periodId } },
        }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * `POST /payroll/periods/{id}/pay` — 🔴 **BY:56 "Ödemeyi Onayla"**.
 *
 * KARAR (iki düğme, iki uç): şema `approve`u açıkça BY:303'e bağlıyor, geriye
 * BY:56 için `pay` kalıyor ve anlam da örtüşüyor — `pay` yalnız dönem
 * `approved` iken çalışır (aksi 409), yani başlıktaki YEŞİL düğme onay
 * zincirinin SON adımıdır: "ödemeyi onayla" = ödendi damgasını bas.
 * REDDEDİLEN alternatif: ikisini de `approve`a bağlamak — o zaman ekranda
 * `pay` ucunun HİÇBİR yüzeyi kalmaz ve dönem asla `paid` olamazdı.
 *
 * 🔴 İdempotent DEĞİLDİR (ikinci çağrı 409 = ikinci ödeme) ⇒ tek-uçuş şart.
 * Üç atlama sayacı (`skipped_unapproved` / `skipped_uncomputed` /
 * `skipped_excluded`) ekranda GÖSTERİLİR.
 */
export function usePayPayrollPeriod(): UseMutationResult<
  PayrollPeriodPayResult,
  Error,
  string
> {
  const invalidate = usePayrollInvalidator();
  return useMutation({
    mutationFn: async (periodId) =>
      unwrap(
        await backendClient.POST("/payroll/periods/{period_id}/pay", {
          params: { path: { period_id: periodId } },
        }),
      ),
    onSuccess: invalidate,
  });
}
