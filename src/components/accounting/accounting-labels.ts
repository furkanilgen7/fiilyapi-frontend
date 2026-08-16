import type { BadgeVariant } from "@/components/ui";
import type { JournalEntryStatus } from "@/lib/api/hooks/useJournalEntries";

/**
 * F-MU1 · Muhasebe ekranlarının SAF katmanı: dönem aritmetiği, durum
 * etiketleri, eylem görünürlüğü ve devre-dışı gerekçeleri.
 *
 * Kanonik mockup: `Ekran 8 - Muhasebe.dc.html` (E8). Yorumlardaki sayılar O
 * dosyanın SATIR numaralarıdır. Bu modülde AĞ ve DOM yoktur; testi
 * `accounting-labels.test.ts`te yaşar.
 */

/** İzin matrisi anahtarı — muhasebe uçlarını `accounting` modülü denetler. */
export const ACCOUNTING_PERMISSION_MODULE = "accounting";

export const ACCOUNTING_URL = "/muhasebe";

// --- Dönem (E8:74-77 `‹ Temmuz 2026 ›`) ----------------------------------

export interface Period {
  year: number;
  /** 1-12. */
  month: number;
}

/**
 * 🔴 YEREL TAKVİM: `getFullYear()/getMonth()` okunur, `toISOString()` İLE
 * DEĞİL — o UTC'ye çevirir ve TR saatinde ayın ilk/son günlerinde dönemi bir
 * ay kaydırırdı (TB5 dersi: üretimde aynı sınıf hata bulundu).
 */
export function currentPeriod(today: Date): Period {
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

/** `‹`/`›` düğmeleri: ay taşarsa YIL da döner (Aralık → Ocak). */
export function shiftPeriod(period: Period, delta: number): Period {
  const zeroBased = period.month - 1 + delta;
  return {
    year: period.year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

// --- Durum (YÖNETİM KARARI 1: etiketler BİREBİR) -------------------------

/**
 * 🔴 Üç durumun Türkçe karşılığı yönetim kararıyla SABİTLENDİ; mockup'ta fiş
 * listesi hiç çizilmediği için başka bir kaynak YOKTUR.
 */
export const JOURNAL_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  draft: "Taslak",
  posted: "Kayıtlı",
  reversed: "Ters Kayıtlı",
};

export function journalStatusLabel(status: JournalEntryStatus): string {
  return JOURNAL_STATUS_LABELS[status];
}

export function journalStatusVariant(status: JournalEntryStatus): BadgeVariant {
  if (status === "posted") return "success";
  if (status === "reversed") return "danger";
  return "neutral";
}

// --- Eylem görünürlüğü (YÖNETİM KARARI 2) --------------------------------

export interface EntryActions {
  canEdit: boolean;
  canDelete: boolean;
  /** `draft → posted`. */
  canPost: boolean;
  /** `posted → reversed` + storno. */
  canReverse: boolean;
}

/**
 * 🔴 Karar: `posted` fişte düzenle/sil **HİÇ SUNULMAZ**. Sunucu ikisini de
 * **409** ile reddeder; 409'u kullanıcıya hata olarak göstermek yerine eylemi
 * hiç sunmamak doğru davranıştır (tıklanabilir ama her zaman patlayan bir
 * düğme, kullanıcıya var olmayan bir yetenek vaat eder).
 *
 * `reversed` uçtur: ne düzenlenir, ne silinir, ne yeniden stornolanır
 * (sonsuz zincir — sunucu da 409 verir).
 */
export function entryActions(status: JournalEntryStatus): EntryActions {
  if (status === "draft") {
    return { canEdit: true, canDelete: true, canPost: true, canReverse: false };
  }
  if (status === "posted") {
    return { canEdit: false, canDelete: false, canPost: false, canReverse: true };
  }
  return { canEdit: false, canDelete: false, canPost: false, canReverse: false };
}

// --- Para tonları --------------------------------------------------------

export type AmountTone = "success" | "danger" | "neutral";

/**
 * E8:88 Net Bakiye kartı yalnız POZİTİF bir örnek verir (`₺ 277.400` yeşil).
 * `net_balance = ALACAK − BORÇ` pekâlâ negatif olabilir — o hâlde yeşil
 * basmak sayının işaretini GİZLERDİ. Şef kararı: negatif kırmızı, pozitif
 * yeşil, tam sıfır nötr.
 */
export function netBalanceTone(value: string): AmountTone {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "neutral";
  return amount > 0 ? "success" : "danger";
}

/**
 * `carried_balance` pencere ÖNCESİ toplamdır: sıfır değilse ilk satırın
 * `running_balance`ı sıfırdan başlamaz ve açıklanamaz görünür. Bu yüzden
 * tablonun ÜSTÜNDE görünür bir devir satırı basılır.
 */
export function hasCarriedBalance(value: string | undefined): boolean {
  if (value === undefined) return false;
  const amount = Number(value);
  return Number.isFinite(amount) && amount !== 0;
}

// --- Devre-dışı gerekçeleri (kanon: SİLİNMEZ, gerekçesi GÖRÜNÜR) ---------

export const ACCOUNTING_REASONS = {
  /** E8:66 "Dışa Aktar" — muhasebe kökünde HİÇBİR dışa aktarma ucu yok. */
  export: "accounting_export",
  /** HP:49 "Excel" — hesap planının da dışa aktarma ucu yok (T3). */
  chartExport: "chart_of_accounts_export",
  /** MZ:48-49 "Excel"/"PDF" — F-MU2 K6: mizanın KENDİ anahtarı. */
  trialBalanceExport: "trial_balance_export",
  /** KDV:48-49 "XML İndir"/"GİB'e Gönder" — F-MU2 K6. */
  vatReturnGib: "vat_return_gib",
  /** Yazma yetkisi yoksa. */
  write: "Muhasebe modülünde yazma yetkiniz yok.",
} as const;
