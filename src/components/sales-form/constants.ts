/**
 * F-P8 T3 · DS (`Form - Daire Satisi.dc.html`) — Yeni Satış formunun sabitleri.
 * Parantez içi sayılar O DOSYANIN satır numaralarıdır. UI metni Türkçe; renk/ölçü
 * kararları `sales-form.css`te token'dır (çıplak hex yok).
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";
import type { DeedCondition, PaymentPlanType, SaleType } from "@/lib/api/hooks/useSales";
import type { CustomerType } from "@/lib/api/hooks/useCustomers";
import { routes } from "@/lib/routes";

/**
 * 🔴 `CustomerCreate` korkulukları — SÖZLEŞMEDEN ölçülmüştür, mockup'tan değil
 * (`src/lib/api/form-limits.contract.test.ts` iki yönlü kapı).
 *
 * Alıcı kartında hiçbir uzunluk korkuluğu YOKTU: `phone` tavanı **20**dir
 * (tedarikçininki 30 — ikisi FARKLI), kimlik kutusu ise `national_id` VEYA
 * `tax_number` olarak gider ve ikisi de **11**dir. Korkuluksuz kutuda 21.
 * karakter sessiz 422 üretiyordu.
 */
export const CUSTOMER_MAX_LENGTH = {
  name: 200,
  nationalId: 11,
  taxNumber: 11,
  phone: 20,
  email: 254,
} as const;

/**
 * Tek "TCKN / VKN" kutusunun korkuluğu. `buyerType`e göre alan DEĞİŞİR ama
 * tavan ikisinde de aynıdır; eşitlik bekçide ayrıca doğrulanır.
 */
export const CUSTOMER_IDENTITY_MAX_LENGTH = CUSTOMER_MAX_LENGTH.nationalId;

export const SALE_FORM_TITLE = "Yeni Satış Kaydı"; // 47
export const SALE_FORM_SUBTITLE =
  "Daire / dükkan satışı — ödeme planı ve tapu takibi otomatik oluşturulur"; // 48

/** Üst breadcrumb + iptal rotası (kabuk canonu; mockup kendi üst barını çizmez). */
export const SALES_LIST_HREF = routes.sales.root();

/**
 * "Satış Tipi" seçici (56) — sunucu `SaleType` enum'una birebir. Mockup metni
 * "Kesin Satış / Rezervasyon (Kapora) / Ön Sözleşme".
 */
export interface SaleTypeOption {
  value: SaleType;
  label: string;
}
export const SALE_TYPE_OPTIONS: SaleTypeOption[] = [
  { value: "sale", label: "Kesin Satış" }, // 56
  { value: "reservation", label: "Rezervasyon (Kapora)" }, // 56
  { value: "pre_contract", label: "Ön Sözleşme" }, // 56
];

/** "Alıcı Tipi" (70) — sunucu `CustomerType`. */
export interface CustomerTypeOption {
  value: CustomerType;
  label: string;
}
export const CUSTOMER_TYPE_OPTIONS: CustomerTypeOption[] = [
  { value: "person", label: "Gerçek Kişi" }, // 70
  { value: "company", label: "Tüzel Kişi (Firma)" }, // 70
];

/**
 * "KDV Oranı" (87) — mockup üç seçenek çizer. Değer sunucuya `vat_pct` (yüzde
 * sayısı) olarak gider; etiketler mockup'tan birebir.
 */
export interface VatOption {
  value: string;
  label: string;
}
export const VAT_OPTIONS: VatOption[] = [
  { value: "1", label: "%1 (150m² altı konut)" }, // 87
  { value: "10", label: "%10" }, // 87
  { value: "20", label: "%20 (Ticari)" }, // 87
];

/**
 * "Ödeme Planı" tipi seçici (99). Mockup metni "Peşin / Peşinat + Taksit /
 * Banka Kredisi / Takas / Trampa" → sunucu `PaymentPlanType`.
 */
export interface PaymentPlanOption {
  value: PaymentPlanType;
  label: string;
}
export const PAYMENT_PLAN_OPTIONS: PaymentPlanOption[] = [
  { value: "cash", label: "Peşin" }, // 99
  { value: "down_payment_installments", label: "Peşinat + Taksit" }, // 99
  { value: "bank_loan", label: "Banka Kredisi" }, // 99
  { value: "barter", label: "Takas / Trampa" }, // 99
];

/** "Tapu Devir Koşulu" (156) — sunucu `DeedCondition`. */
export interface DeedConditionOption {
  value: DeedCondition;
  label: string;
}
export const DEED_CONDITION_OPTIONS: DeedConditionOption[] = [
  { value: "full_payment", label: "Tüm ödeme tamamlanınca" }, // 156
  { value: "after_down_payment", label: "Peşinat sonrası" }, // 156
  { value: "at_contract", label: "Sözleşme imzasında" }, // 156
];

/**
 * "Gecikme faizi uygulanacak (aylık %2,5)" kutusu (163) — P8 kararı gereği
 * BİLGİ alanıdır: işaretlenirse `late_fee_monthly_pct` gövdeye girer ama plan
 * tutarını ŞİŞİRMEZ (Σ = sale_price korunur; tahakkuk yalnız gösterimdir).
 */
export const LATE_FEE_MONTHLY_PCT = "2.5"; // 163
export const LATE_FEE_LABEL = "Gecikme faizi uygulanacak (aylık %2,5)"; // 163
export const CONDOMINIUM_LABEL = "Kat irtifakı kuruldu"; // 161
export const MORTGAGE_LABEL = "İpotek var (banka kredisi)"; // 162

/**
 * "Peşinat için otomatik fatura kesilsin" (206) — `UnitSaleCreate`te KARŞILIĞI
 * YOKTUR. Kutu DEVRE DIŞI basılır (stok-girişi "otomatik bildirim" emsali) ve
 * gövdeye HİÇBİR anahtar eklemez — seçili bir kutu "fatura kesilecek" demesin.
 *
 * 🔴 F-UNIT1 T5 · GEREKÇE DÜZELTİLDİ. Eski metin ("Fatura Yönetimi modülü henüz
 * bağlanmadı") BAYATTI: `/faturalar` + `/faturalar/kes` CANLI. Eksik olan modül
 * değil, satıştan faturaya giden OTOMASYONDUR — fatura ekranının kendi metni
 * bunu zaten doğru söylüyor (`invoice-labels.ts`: "Hakediş → Fatura otomasyonu
 * henüz açılmadı; faturalar elle kesilir").
 */
export const AUTO_INVOICE_LABEL = "Peşinat için otomatik fatura kesilsin"; // 206
export const AUTO_INVOICE_PENDING_REASON =
  "Satıştan otomatik fatura kesme henüz açılmadı — fatura Fatura Yönetimi'nden elle kesilir";

/** "Satış Belgeleri" kartı (167-201) — BC form-slot'a pending. */
export const SALE_DOCUMENTS_TITLE = "Satış Belgeleri"; // 169
export const SALE_DOCUMENTS_PENDING_REASON =
  "Belge yükleme Belge Yönetimi'ne bağlanınca açılacak — şimdilik yalnız önizleme";

/** 170-200 — altı belge kutusu (emoji + zemin tonu + başlık + alt metin). */
export const SALE_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  { emoji: "📄", iconBg: "var(--color-danger-soft)", title: "Satış Sözleşmesi", subtitle: "İmzalı nüsha" }, // 172-175
  { emoji: "🪪", iconBg: "var(--color-primary-soft)", title: "Alıcı Kimlik", subtitle: "Fotokopi" }, // 176-180
  { emoji: "🧾", iconBg: "var(--color-success-soft)", title: "Peşinat Dekontu", subtitle: "Banka dekontu" }, // 181-185
  { emoji: "🏦", iconBg: "var(--color-warning-soft)", title: "Kredi Onay Yazısı", subtitle: "Banka kredisi ise" }, // 186-190
  { emoji: "📜", iconBg: "var(--color-accent-purple-soft)", title: "Tapu Senedi", subtitle: "Devir sonrası" }, // 191-195
  { emoji: "🔑", iconBg: "var(--color-success-tint)", title: "Teslim Tutanağı", subtitle: "Anahtar teslimi" }, // 196-200
];

/** Ünite bilgisi/kâr kutularında değeri olmayan alanın gösterimi. */
export const EMPTY_METRIC = "—";

/** Ünite maliyeti P10'dan gelir; zarf `available:false` iken gösterilen gerekçe. */
export const UNIT_COST_PENDING_REASON =
  "Ünite maliyeti henüz hesaplanmadı (proje maliyet modülü)";
export const SALE_PROFIT_UNKNOWN_REASON =
  "Ünite maliyeti gelmeden bu satıştan kâr hesaplanamaz";

/** "Bu Satıştan Kâr" alt satırı (90). */
export const SALE_PROFIT_FORMULA = "Satış bedeli − ünite maliyeti";

/** Boş/henüz üretilmemiş plan tablosu için görünür not. */
export const PLAN_EMPTY_NOTICE =
  "Ödeme planı, alanları doldurup “Plan Oluştur” dediğinizde sunucuda üretilir.";

/**
 * PUT installments = DEĞİŞTİRME (spec K5): kaydederken düzenlenmiş plan gövdenin
 * TAMAMINI taşır, gövdede geçmeyen taksit sunucuda SİLİNİR. Kullanıcıya görünür
 * uyarı basılır (hakediş `PUT lines` emsali).
 */
export const PLAN_REPLACE_WARNING =
  "Ödeme planını kaydettiğinizde tablodaki taksitler mevcut planın YERİNE geçer; tablodan sildiğiniz satır kalıcı olarak silinir.";

/** Bir satış oluşturulduktan (Plan Oluştur) sonra tipin değiştirilememesi. */
export const SALE_CREATED_LOCK_REASON =
  "Satış kaydı oluşturuldu — tipi değiştirmek için kaydı iptal edip yeniden açın";
