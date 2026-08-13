import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { InstallmentPaymentMethod } from "@/lib/api/hooks/useSaleInstallments";
import type { UnitSaleResponse, UnitSaleStatus } from "@/lib/api/hooks/useSales";
import { formatDateDots } from "@/lib/format";

/**
 * F-P8 T2 · SY (`Satış Yönetimi.dc.html`) etiket/renk sözlüğü. Parantez içi
 * sayılar O dosyanın SATIR numaralarıdır.
 *
 * ⚠️ EN ÖNEMLİ KURAL: bu dosyada PARA ya da EŞİK hesabı YOKTUR. Satır
 * türevlerinin (tahsil/kalan/gecikme sayısı) hepsi sunucudan gelir; buradaki
 * her şey sunucunun ALANLARININ görünüme çevrilmesidir. Rozet metni/rengi TEK
 * KAYNAK olarak burada durur — bileşenler kendi eşlemesini yazmaz.
 */

/** Tablo satırının ihtiyaç duyduğu ALANLAR — saf modüller tam yanıtı istemez. */
export type SaleRow = Pick<
  UnitSaleResponse,
  | "id"
  | "status"
  | "unit_label"
  | "customer_name"
  | "customer_national_id"
  | "customer_tax_number"
  | "sale_price"
  | "paid_amount"
  | "remaining_amount"
  | "payment_plan_type"
  | "installment_total"
  | "installment_paid_count"
  | "overdue_installment_count"
  | "reservation_deposit"
  | "reservation_due_date"
>;

/**
 * Sunucu enum'unun (`UnitSaleStatus`) Türkçe karşılıkları. Rozet metni HER
 * ZAMAN bundan türemez — `saleStatusBadge` mockup'ın ÜÇ ek görünümünü
 * (Taksitli/Gecikmiş) sunucunun TÜREV alanlarıyla ayırır; bu sözlük enum'un
 * kendisinin çevirisidir (erişilebilirlik metni + olası başka yüzeyler için).
 */
export const SALE_STATUS_LABELS: Record<UnitSaleStatus, string> = {
  reservation: "Rezerve", // 193
  active: "Aktif",
  deed_transferred: "Tapu Devredildi", // 166, 202
  cancelled: "İptal",
};

export interface SaleStatusBadge {
  label: string;
  variant: BadgeVariant;
  /** CSS değiştiricisi — mockup'ın rozet metin tonları için (`.satis-badge--*`). */
  modifier: string;
}

/**
 * Durum rozeti (166 · 175 · 184 · 193 · 202).
 *
 * Mockup DÖRT görünüm çizer ama sunucunun `status` enum'u DÖRT DEĞERDİR ve
 * ikisi örtüşmez: "Taksitli" (175) ve "Gecikmiş" (184) birer `active` satıştır.
 * Ayrımı yapan alanlar SUNUCUDAN gelir (`overdue_installment_count`,
 * `payment_plan_type`) — istemci vade/gecikme HESAPLAMAZ.
 *
 * Renkler mockup'ın zemin/metin çiftlerinden `Badge` varyantlarına oturur:
 * Tapu Devredildi `#dcfce7/#16a34a` = success · Taksitli `#dbeafe/#2563eb` =
 * primary · Gecikmiş `#fee2e2/#dc2626` = danger · Rezerve `#fef3c7/#d97706` =
 * warning.
 */
export function saleStatusBadge(sale: SaleRow): SaleStatusBadge {
  if (sale.status === "deed_transferred") {
    return { label: "Tapu Devredildi", variant: "success", modifier: "deed" };
  }
  if (sale.status === "reservation") {
    return { label: "Rezerve", variant: "warning", modifier: "reservation" };
  }
  if (sale.status === "cancelled") {
    // Mockup iptal satırı ÇİZMEZ ama uç `cancelled` kayıtları da döndürür
    // (sunucu süzmez) — uydurma bir rozet yerine enum'un çevirisi basılır.
    return { label: SALE_STATUS_LABELS.cancelled, variant: "neutral", modifier: "cancelled" };
  }
  if (sale.overdue_installment_count > 0) {
    return { label: "Gecikmiş", variant: "danger", modifier: "overdue" };
  }
  if (sale.payment_plan_type === "down_payment_installments") {
    return { label: "Taksitli", variant: "primary", modifier: "installments" };
  }
  return { label: SALE_STATUS_LABELS.active, variant: "primary", modifier: "active" };
}

/** Satır zemini (177 kırmızı tonu · 186 kehribar tonu; geri kalanı beyaz). */
export type SaleRowTone = "overdue" | "reservation" | "default";

export function saleRowTone(sale: SaleRow): SaleRowTone {
  if (sale.status === "cancelled") return "default";
  if (sale.overdue_installment_count > 0) return "overdue"; // 177
  if (sale.status === "reservation") return "reservation"; // 186
  return "default";
}

/* ---------------------------------------------------------------------------
 * Durum süzgeci (146) — İSTEMCİDE çalışır.
 *
 * ⚠️ `GET /projects/{id}/sales` HİÇ query parametresi ALMAZ (openapi; T1
 * notu): uydurma bir `status=` göndermek 422 verir. Uç sayfasız olduğu için
 * istemci süzmesi kayıt DÜŞÜRMEZ. Mockup'ın seçenekleri sunucu enum'uyla
 * BİREBİR DEĞİLDİR ("Vadesi Geçen" bir durum değil, `overdue_installment_
 * count > 0` türevidir) — bu yüzden süzgeç anahtarları ayrı bir kümedir.
 * ------------------------------------------------------------------------ */

export type SalesStatusFilter = "deed_transferred" | "reservation" | "overdue";

export interface SalesStatusFilterOption {
  value: SalesStatusFilter;
  label: string;
}

/** 146 — "Tüm Durumlar" seçeneği süzgeci KALDIRIR (`undefined`). */
export const SALES_STATUS_FILTER_ALL_LABEL = "Tüm Durumlar";

export const SALES_STATUS_FILTER_OPTIONS: SalesStatusFilterOption[] = [
  { value: "deed_transferred", label: "Tapulu" }, // 146
  { value: "reservation", label: "Rezerve" }, // 146
  { value: "overdue", label: "Vadesi Geçen" }, // 146
];

/** URL'den okunan serbest metni güvenli bir süzgece daraltır. */
export function parseSalesStatusFilter(raw: string | null): SalesStatusFilter | undefined {
  return SALES_STATUS_FILTER_OPTIONS.find((option) => option.value === raw)?.value;
}

export function matchesSalesStatusFilter(
  sale: SaleRow,
  filter: SalesStatusFilter | undefined,
): boolean {
  if (filter === undefined) return true;
  if (filter === "overdue") return sale.overdue_installment_count > 0;
  return sale.status === filter;
}

/** Süzgeci UYGULAR — sıralamayı KORUR (sunucunun sırası kanon). */
export function filterSales<T extends SaleRow>(
  rows: readonly T[],
  filter: SalesStatusFilter | undefined,
): T[] {
  return rows.filter((row) => matchesSalesStatusFilter(row, filter));
}

/* ------------------------------------------------------------------------ */

export interface PaymentPlanCell {
  text: string;
  /** 183 — gecikmiş satırda plan hücresi kırmızı ve kalındır. */
  isOverdue: boolean;
  /** 192 — planı olmayan satırda hücre soluk tondadır. */
  isMuted: boolean;
}

/**
 * "Ödeme Planı" hücresi (165 "Peşin" · 174 "12 taksit · 8/12" · 183 kırmızı
 * "10 taksit · 5/10" · 192 "Belirlenmedi" · 201 "Peşin").
 *
 * Taksit sayıları SUNUCUNUN türevleridir (`installment_total` /
 * `installment_paid_count`) — istemci ödenmiş taksit SAYMAZ.
 */
export function paymentPlanCell(sale: SaleRow): PaymentPlanCell {
  const isOverdue = sale.overdue_installment_count > 0;
  if (sale.installment_total > 0 && sale.payment_plan_type === "down_payment_installments") {
    return {
      text: `${sale.installment_total} taksit · ${sale.installment_paid_count}/${sale.installment_total}`,
      isOverdue,
      isMuted: false,
    };
  }
  if (sale.payment_plan_type === "cash") return { text: "Peşin", isOverdue, isMuted: false };
  if (sale.payment_plan_type === "bank_loan") {
    return { text: "Banka Kredisi", isOverdue, isMuted: false };
  }
  if (sale.payment_plan_type === "barter") return { text: "Takas", isOverdue, isMuted: false };
  if (sale.payment_plan_type === "down_payment_installments") {
    // Plan tipi seçilmiş ama taksit satırı henüz üretilmemiş (DS'nin
    // `generate-plan` adımı beklenir) — "Belirlenmedi"den AYRI bir durumdur.
    return { text: "Plan üretilmedi", isOverdue, isMuted: true };
  }
  return { text: "Belirlenmedi", isOverdue, isMuted: true }; // 192
}

export type CustomerLineTone = "muted" | "danger" | "warning";

export interface CustomerLine {
  text: string;
  tone: CustomerLineTone;
}

/**
 * "Alıcı" hücresinin İKİNCİ satırı (161 "TCKN: 123****789" · 170 · 179
 * "⚠ 2 taksit gecikmiş" · 188 "Kapora alındı · 15 gün süre" · 197 "VKN:
 * 7788990011").
 *
 * ⚠️ 188'in "15 gün süre" ifadesi bir GERİ SAYIMDIR; istemci gün saymaz
 * (yerel saat/gün kayması riski + türev sunucuda). Rezervasyonun VADESİ
 * doğrudan basılır — bilgi kaybı yoktur, uydurma da yoktur.
 *
 * ⚠️ TCKN mockup'taki gibi MASKELENİR (161/170); VKN kurumsal bir kimliktir ve
 * mockup 197'de AÇIK basılır — maskeleme oraya taşınmaz.
 */
export function customerLine(sale: SaleRow): CustomerLine | null {
  if (sale.overdue_installment_count > 0) {
    return { text: `⚠ ${sale.overdue_installment_count} taksit gecikmiş`, tone: "danger" }; // 179
  }
  if (sale.status === "reservation") {
    const due =
      sale.reservation_due_date === null
        ? null
        : `${formatDateDots(sale.reservation_due_date)} tarihine kadar`;
    const deposit = sale.reservation_deposit === null ? "Rezerve" : "Kapora alındı";
    return { text: due === null ? deposit : `${deposit} · ${due}`, tone: "warning" }; // 188
  }
  if (sale.customer_national_id !== null && sale.customer_national_id.length > 0) {
    return { text: `TCKN: ${maskNationalId(sale.customer_national_id)}`, tone: "muted" }; // 161
  }
  if (sale.customer_tax_number !== null && sale.customer_tax_number.length > 0) {
    return { text: `VKN: ${sale.customer_tax_number}`, tone: "muted" }; // 197
  }
  return null;
}

/** 161 · "123****789" — baş ve son üç hane açık, ortası maskeli. */
export function maskNationalId(nationalId: string): string {
  if (nationalId.length <= 6) return nationalId;
  return `${nationalId.slice(0, 3)}****${nationalId.slice(-3)}`;
}

/**
 * 24 · "Fiyat Listesi" — hedef ekranın mockup'ı ÇİZİLMEMİŞTİR ve ekran İCAT
 * EDİLMEZ (F-TH kalıcı kuralı: rotası olmayan mockup öğesi SİLİNMEZ, devre
 * dışı basılır).
 */
export const PRICE_LIST_PENDING_REASON =
  "Fiyat listesi ekranı henüz tasarlanmadı — mockup çizilince açılacak";

/**
 * 58 · "%79 tahsilat" — `collection_pct` sunucudan gelir ve sözleşme tutarı
 * SIFIRKEN `null`dur. İstemci `collected/contracted` bölmesi YAPMAZ.
 */
export const COLLECTION_PCT_UNKNOWN_REASON =
  "Sözleşmeye bağlanmış satış tutarı yok — tahsilat oranı hesaplanmaz";

/**
 * Taksit satırının "Ödeme Şekli" seçicisi (DS 114 · 122 · 129 · 136). Enum
 * ŞEMADA GERÇEKTİR (`InstallmentPaymentMethod`) — pending hücre DEĞİL. Etiket
 * haritası TEK KAYNAK olarak burada durur; DS formu (`sales-form/`) kendi
 * eşlemesini yazmaz.
 *
 * Mockup satır seçenekleri "Havale/EFT · Nakit · Çek · Otomatik Ödeme" —
 * sunucu enum'uyla birebir eşlenir (`transfer` = Havale/EFT).
 */
export const INSTALLMENT_PAYMENT_METHOD_LABELS: Record<InstallmentPaymentMethod, string> = {
  transfer: "Havale/EFT", // 122
  cash: "Nakit", // 122
  cheque: "Çek", // 122
  auto_payment: "Otomatik Ödeme", // 129
};

export interface InstallmentPaymentMethodOption {
  value: InstallmentPaymentMethod;
  label: string;
}

/** Seçici seçenekleri — enum sırasını korur (Havale varsayılan görünür). */
export const INSTALLMENT_PAYMENT_METHOD_OPTIONS: InstallmentPaymentMethodOption[] = (
  Object.keys(INSTALLMENT_PAYMENT_METHOD_LABELS) as InstallmentPaymentMethod[]
).map((value) => ({ value, label: INSTALLMENT_PAYMENT_METHOD_LABELS[value] }));

/** Ünite doluluk haritasının (63-140) hücre tonları — kaynak `sales_status`. */
export type UnitOccupancyTone = "sold" | "reserved" | "available" | "closed";

export const UNIT_OCCUPANCY_LABELS: Record<UnitOccupancyTone, string> = {
  sold: "Tapulu", // 67
  reserved: "Rezerve", // 68
  available: "Boş", // 69
  closed: "Kapalı",
};
