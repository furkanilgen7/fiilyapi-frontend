import { Button, Field, Input, Select } from "@/components/ui";
import { INSTALLMENT_PAYMENT_METHOD_OPTIONS } from "@/components/sales/sales-labels";
import { formatAmount } from "@/lib/format";

import { PAYMENT_PLAN_OPTIONS, PLAN_EMPTY_NOTICE, PLAN_REPLACE_WARNING } from "./constants";
import { updatePlanRow, type PlanRowValues, type SaleFormValues } from "./form-state";
import type { InstallmentPaymentMethod } from "@/lib/api/hooks/useSaleInstallments";

interface PaymentPlanCardProps {
  values: SaleFormValues;
  /** Sunucudan üretilmiş plan satırları (düzenlenebilir). */
  planRows: readonly PlanRowValues[];
  /** Sunucunun plan toplamı (Σ = sale_price) — istemci `items`ten toplamaz. */
  planTotalText: string | null;
  planEdited: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  onChangeField: <K extends keyof SaleFormValues>(field: K, value: SaleFormValues[K]) => void;
  onGeneratePlan: () => void;
  onChangePlanRows: (rows: PlanRowValues[]) => void;
  locked: boolean;
}

/**
 * "Ödeme Planı" kartı (DS 95-150).
 *
 * ⚠️ Plan SUNUCUDA üretilir (`generate-plan`): kuruş dengelemesi son taksitte,
 * **Σ = sale_price**. İstemci taksit tutarı HESAPLAMAZ, yalnız sunucunun
 * verdiğini gösterir ve kullanıcının düzeltmelerini toplar. "Plan Oluştur"
 * satışı oluşturur + planı üretir (F-SD "iki adımlı kaydetme" emsali);
 * bu yüzden bir kez üretilince plan parametreleri kilitlenir.
 *
 * ⚠️ Kaydetmede PUT installments = DEĞİŞTİRME (spec K5): tablo BÜTÜN olarak
 * gider, silinen satır sunucuda da silinir — görünür uyarı basılır.
 */
export function PaymentPlanCard({
  values,
  planRows,
  planTotalText,
  planEdited,
  isGenerating,
  canGenerate,
  onChangeField,
  onGeneratePlan,
  onChangePlanRows,
  locked,
}: PaymentPlanCardProps) {
  const hasPlan = planRows.length > 0;

  function patchRow(key: string, patch: Partial<Omit<PlanRowValues, "key">>) {
    onChangePlanRows(updatePlanRow(planRows, key, patch));
  }

  return (
    <section className="pf-card sf-plan">
      {/* 97-101 */}
      <div className="sf-plan__head">
        <span className="sf-plan__title">💳 Ödeme Planı</span>
        <Select
          size="row"
          aria-label="Ödeme planı tipi"
          data-testid="satis-form-plan-tipi"
          disabled={locked}
          value={values.paymentPlanType}
          onChange={(event) =>
            onChangeField(
              "paymentPlanType",
              event.target.value as SaleFormValues["paymentPlanType"],
            )
          }
        >
          {PAYMENT_PLAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="sf-plan__generate"
          data-testid="satis-form-plan-olustur"
          disabled={!canGenerate || isGenerating || locked}
          onClick={onGeneratePlan}
        >
          {isGenerating ? "Oluşturuluyor…" : "Plan Oluştur"}
        </Button>
      </div>

      {/* 102-107 — plan parametreleri */}
      <div className="sf-plan__params">
        <Field label="Peşinat (₺)">
          {(control) => (
            <Input
              {...control}
              className="sf-amount-input"
              inputMode="decimal"
              data-testid="satis-form-pesinat"
              readOnly={locked}
              value={values.downPayment}
              onChange={(event) => onChangeField("downPayment", event.target.value)}
            />
          )}
        </Field>
        <Field label="Taksit Sayısı">
          {(control) => (
            <Input
              {...control}
              className="sf-amount-input"
              inputMode="numeric"
              data-testid="satis-form-taksit-sayisi"
              readOnly={locked}
              value={values.installmentCount}
              onChange={(event) => onChangeField("installmentCount", event.target.value)}
            />
          )}
        </Field>
        <Field label="İlk Taksit Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="satis-form-ilk-taksit"
              readOnly={locked}
              value={values.firstInstallmentDate}
              onChange={(event) => onChangeField("firstInstallmentDate", event.target.value)}
            />
          )}
        </Field>
        <Field label="Vade Farkı (%)">
          {(control) => (
            <Input
              {...control}
              className="sf-amount-input"
              inputMode="decimal"
              data-testid="satis-form-vade-farki"
              readOnly={locked}
              value={values.termInterestPct}
              onChange={(event) => onChangeField("termInterestPct", event.target.value)}
            />
          )}
        </Field>
      </div>

      {!hasPlan && (
        <p className="sf-plan__notice" data-testid="satis-form-plan-bos">
          {PLAN_EMPTY_NOTICE}
        </p>
      )}

      {hasPlan && (
        <>
          {planEdited && (
            <p className="sf-plan__warning" data-testid="satis-form-plan-uyari">
              {PLAN_REPLACE_WARNING}
            </p>
          )}
          <table className="sf-plan-table" data-testid="satis-form-plan-tablo">
            <thead>
              <tr>
                <th>Taksit</th>
                <th>Açıklama</th>
                <th className="sf-plan-table__center">Vade Tarihi</th>
                <th className="sf-plan-table__right">Tutar</th>
                <th className="sf-plan-table__center">Ödeme Şekli</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr
                  key={row.key}
                  className={row.isDownPayment ? "sf-plan-row--down" : undefined}
                >
                  <td className="sf-plan-table__seq">
                    {row.isDownPayment ? "Peşinat" : `${row.sequenceNo}`}
                  </td>
                  {/* Plan satırları, satış oluşturulduktan SONRA da
                      DÜZENLENEBİLİR kalır: kaydetmede PUT DEĞİŞTİRME ile giderler
                      (spec K5). `locked` yalnız plan PARAMETRELERİNİ dondurur. */}
                  <td className="sf-plan-table__muted">
                    <Input
                      size="row"
                      aria-label={`${row.sequenceNo}. taksit açıklaması`}
                      value={row.label}
                      onChange={(event) => patchRow(row.key, { label: event.target.value })}
                    />
                  </td>
                  <td className="sf-plan-table__center">
                    <Input
                      size="row"
                      type="date"
                      aria-label={`${row.sequenceNo}. taksit vade tarihi`}
                      value={row.dueDate}
                      onChange={(event) => patchRow(row.key, { dueDate: event.target.value })}
                    />
                  </td>
                  <td className="sf-plan-table__right">
                    <Input
                      size="row"
                      className="sf-amount-input"
                      inputMode="decimal"
                      aria-label={`${row.sequenceNo}. taksit tutarı`}
                      value={row.amount}
                      onChange={(event) => patchRow(row.key, { amount: event.target.value })}
                    />
                  </td>
                  <td className="sf-plan-table__center">
                    <Select
                      size="row"
                      aria-label={`${row.sequenceNo}. taksit ödeme şekli`}
                      value={row.paymentMethod}
                      onChange={(event) =>
                        patchRow(row.key, {
                          paymentMethod: event.target.value as InstallmentPaymentMethod | "",
                        })
                      }
                    >
                      <option value="">Seçiniz…</option>
                      {INSTALLMENT_PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* 143-147 — TOPLAM = sale_price (Σ SUNUCUDAN) */}
              <tr>
                <td colSpan={3}>TOPLAM</td>
                <td className="sf-plan-table__right" data-testid="satis-form-plan-toplam">
                  {planTotalText === null ? "—" : `₺${formatAmount(planTotalText)}`}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </section>
  );
}
