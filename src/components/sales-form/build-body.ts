/**
 * F-P8 T3 · Satış/müşteri/plan gövdelerinin TEK kurucusu.
 *
 * ÜÇ bağlayıcı kural (hepsinin adlı testi `build-body.test.ts`tedir):
 *
 * 1. **`has_condominium_easement` ve `has_mortgage` DAİMA gövdededir** (üretilmiş
 *    tip tuzağı — T1 kaydı): şemada varsayılanlı ama `openapi-typescript`
 *    çıktısında ZORUNLU. İkisi de her satış gövdesinde AÇIKÇA verilir.
 * 2. **PENDING SIZINTISI YASAK:** "otomatik fatura" (206) ve belge yüzeyleri
 *    gövdeye HİÇBİR anahtar eklemez — `form-state.ts` bu alanları tanımlamadığı
 *    için buradan da geçemezler.
 * 3. **TCKN ⇄ VKN AYRIMI:** tek "TCKN / VKN" kutusu (72), `buyerType`e göre
 *    `national_id` (gerçek kişi) YA DA `tax_number` (tüzel) olur — ikisi birden
 *    değil. Gecikme faizi (163) işaretliyse `late_fee_monthly_pct` gönderilir
 *    ama plan ŞİŞMEZ (P8 kararı; Σ = sale_price sunucuda korunur).
 *
 * Boş bırakılan isteğe bağlı alanlar için anahtar HİÇ kurulmaz (`null` göndermek
 * ile göndermemek burada aynı; gövdeyi gürültüsüz tutmak anahtar testini okunur
 * kılar).
 */

import type { CustomerCreate } from "@/lib/api/hooks/useCustomerMutations";
import type { SaleInstallmentInput, UnitSaleCreate } from "@/lib/api/hooks/useSaleMutations";
import type { SaleType } from "@/lib/api/hooks/useSales";

import { LATE_FEE_MONTHLY_PCT } from "./constants";
import { normalizeDecimalInput, type PlanRowValues, type SaleFormValues } from "./form-state";

/** İsteğe bağlı ondalık: normalize edilebiliyorsa gövdeye string girer. */
function optionalDecimal(raw: string): string | null {
  return normalizeDecimalInput(raw);
}

/**
 * Yeni müşteri gövdesi (`POST /customers`). Yalnız `customer_type` + `name`
 * ZORUNLUdur; TCKN/VKN tipe göre TEK alana yazılır.
 */
export function buildCustomerCreateBody(values: SaleFormValues): CustomerCreate {
  const name = values.buyerName.trim();
  const identity = values.buyerNationalOrTaxId.trim();
  const phone = values.buyerPhone.trim();
  const email = values.buyerEmail.trim();
  const address = values.buyerAddress.trim();

  return {
    customer_type: values.buyerType,
    name,
    ...(identity
      ? values.buyerType === "person"
        ? { national_id: identity }
        : { tax_number: identity }
      : {}),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
  };
}

/**
 * Satış gövdesi (`POST /projects/{id}/sales`). `customerId` çağırandan gelir
 * (kayıtlı seçim ya da yeni müşteri POST'unun döndürdüğü id). `saleType` de
 * çağırandan gelir: "Satışı Kaydet" üstteki seçiciyi, "Rezervasyon Yap"
 * `reservation`ı geçirir.
 */
export function buildSaleCreateBody(
  values: SaleFormValues,
  customerId: string,
  saleType: SaleType,
): UnitSaleCreate {
  const salePrice = normalizeDecimalInput(values.salePrice) ?? values.salePrice.trim();
  const discount = optionalDecimal(values.discountAmount);
  const vat = optionalDecimal(values.vatPct);
  const downPayment = optionalDecimal(values.downPayment);
  const installmentCount = values.installmentCount.trim();
  const termInterest = optionalDecimal(values.termInterestPct);

  return {
    unit_id: values.unitId,
    customer_id: customerId,
    sale_type: saleType,
    sale_price: salePrice,
    // (1) DAİMA gövdede — üretilmiş tip tuzağı.
    has_condominium_easement: values.hasCondominiumEasement,
    has_mortgage: values.hasMortgage,
    ...(discount !== null ? { discount_amount: discount } : {}),
    ...(vat !== null ? { vat_pct: vat } : {}),
    ...(values.advisorUserId ? { advisor_user_id: values.advisorUserId } : {}),
    ...(values.deedCondition ? { deed_condition: values.deedCondition } : {}),
    ...(values.plannedDeedDate ? { planned_deed_date: values.plannedDeedDate } : {}),
    ...(values.deliveryDate ? { delivery_date: values.deliveryDate } : {}),
    // (3) Gecikme faizi BİLGİ alanı — plan tutarını şişirmez.
    ...(values.lateFeeEnabled ? { late_fee_monthly_pct: LATE_FEE_MONTHLY_PCT } : {}),
    ...(values.paymentPlanType ? { payment_plan_type: values.paymentPlanType } : {}),
    ...(downPayment !== null ? { down_payment: downPayment } : {}),
    ...(installmentCount ? { installment_count: Number(installmentCount) } : {}),
    ...(values.firstInstallmentDate ? { first_installment_date: values.firstInstallmentDate } : {}),
    ...(termInterest !== null ? { term_interest_pct: termInterest } : {}),
  };
}

/**
 * Düzenlenmiş planı `PUT /sales/{id}/installments` gövdesine çevirir.
 *
 * 🛑 DEĞİŞTİRME semantiği (spec K5): gövde planın TAMAMINI taşır. Çağıran tabloyu
 * her zaman BÜTÜN olarak gönderir; kuruş dengelemesi sunucudadır, istemci
 * yeniden bölmez.
 */
export function buildInstallmentsSave(rows: readonly PlanRowValues[]): SaleInstallmentInput[] {
  return rows.map((row) => ({
    sequence_no: row.sequenceNo,
    label: row.label.trim(),
    due_date: row.dueDate,
    amount: normalizeDecimalInput(row.amount) ?? row.amount.trim(),
    ...(row.paymentMethod ? { payment_method: row.paymentMethod } : {}),
  }));
}
