import type {
  PayrollLineResponse,
  PayrollPeriodListRow,
  PayrollSectionResponse,
  WorkerSource,
} from "@/lib/api/hooks/usePayroll";

import { SOURCE_ORDER } from "./payroll-labels";

/**
 * F-BOR T2 · `/bordro` ekranının SAF türetmeleri. Bileşenler hesap YAPMAZ;
 * hepsi burada, tek başına test edilebilir hâlde durur.
 *
 * 🔴 PARA ALANLARI STRING'DİR (Decimal). Bu dosyada hiçbir para alanı
 * `Number`a çevrilip toplanmaz — toplamlar SUNUCUNUN `summary` alanlarından
 * basılır. Tek istisna yok.
 */

/* ------------------------------------------------------------ ay gezgini */

/**
 * BY:50-54 gezgini KRONOLOJİK adımlar. Sunucunun liste sırası bir sözleşme
 * DEĞİLDİR (uç yalnız `limit`/`offset` alır), bu yüzden sıra burada kurulur:
 * eskiden yeniye. Kopya döndürülür — girdi dizisi MUTASYONA UĞRAMAZ.
 */
export function sortPeriodsChronologically(
  rows: readonly PayrollPeriodListRow[],
): PayrollPeriodListRow[] {
  return [...rows].sort((a, b) => (a.year - b.year) * 12 + (a.month - b.month));
}

/**
 * Varsayılan dönem = EN YENİ dönem (kronolojik sıranın sonu). Sunucu "bugün"ü
 * okumaz ve mockup'ın "Temmuz 2026"sı bir ÖRNEKTİR; istemcinin takvimine
 * bakıp o ayın dönemini aramak, o dönem açılmamışsa boş ekran üretirdi.
 */
export function defaultPeriodId(
  rows: readonly PayrollPeriodListRow[],
): string | undefined {
  const sorted = sortPeriodsChronologically(rows);
  return sorted[sorted.length - 1]?.id;
}

export interface PeriodNavigation {
  /** `‹` hedefi (BY:51) — yoksa `undefined` ⇒ düğme devre dışı. */
  previousId: string | undefined;
  /** `›` hedefi (BY:53). */
  nextId: string | undefined;
  current: PayrollPeriodListRow | undefined;
}

/** Seçili dönemin komşuları — kronolojik dizideki bir önceki/sonraki satır. */
export function periodNavigation(
  rows: readonly PayrollPeriodListRow[],
  currentId: string | undefined,
): PeriodNavigation {
  const sorted = sortPeriodsChronologically(rows);
  const index = sorted.findIndex((row) => row.id === currentId);
  if (index < 0) return { previousId: undefined, nextId: undefined, current: undefined };
  return {
    previousId: sorted[index - 1]?.id,
    nextId: sorted[index + 1]?.id,
    current: sorted[index],
  };
}

/* -------------------------------------------------------------- bölümler */

/**
 * BY:124/172/240/268 — bölümler MOCKUP SIRASINDA çizilir; sunucunun dizi
 * sırasına güvenilmez.
 *
 * 🔴 ENUM TAMLIĞI: `SOURCE_ORDER` dışında bir `personnel_source` gelirse
 * (enum büyüdü ve bu dosya güncellenmedi) bölüm DÜŞÜRÜLMEZ, sıranın sonuna
 * eklenir. Sessiz kayıp, yanlış sıradan çok daha kötüdür.
 */
export function orderedSections(
  sections: readonly PayrollSectionResponse[],
): PayrollSectionResponse[] {
  const rank = (source: WorkerSource): number => {
    const index = SOURCE_ORDER.indexOf(source);
    return index < 0 ? SOURCE_ORDER.length : index;
  };
  return [...sections].sort((a, b) => rank(a.personnel_source) - rank(b.personnel_source));
}

/** `Tümü` dahil sekme sayacı (BY:98-102). Sayı `line_count`tan gelir. */
export function totalLineCount(sections: readonly PayrollSectionResponse[]): number {
  return sections.reduce((sum, section) => sum + section.line_count, 0);
}

/** Aktif sekme `null` ise (Tümü) hepsi, değilse yalnız o kaynak. */
export function visibleSections(
  sections: readonly PayrollSectionResponse[],
  activeSource: WorkerSource | null,
): PayrollSectionResponse[] {
  const ordered = orderedSections(sections);
  if (activeSource === null) return ordered;
  return ordered.filter((section) => section.personnel_source === activeSource);
}

/* ---------------------------------------------------------------- satır */

/**
 * BY:142-147 tutar girdilerinin AÇIK/KAPALI kararı — SATIRIN KENDİSİNDEN
 * türer, ekran sabitinden değil.
 *
 * * `excluded` → ödemeye hiç girmez (K2); bölüşüm düzenlemek anlamsızdır.
 * * `paid` → ödendi damgası basılmış; tutar artık bir GEÇMİŞ kaydıdır.
 * * `uncomputed` → net YOKTUR; bölüşülecek bir tutar yoktur.
 */
export function isLineSplitEditable(line: PayrollLineResponse): boolean {
  if (line.status === "excluded") return false;
  if (line.status === "paid") return false;
  if (line.status === "uncomputed") return false;
  return line.net_amount !== null;
}

/**
 * Devre dışı girdinin GÖRÜNÜR gerekçesi — 🔴 satırdan TÜRER: `excluded`
 * satırda sunucunun `excluded_reason` metni varsa O basılır (sabit cümle
 * DEĞİL), yoksa duruma özgü varsayılan.
 */
export function lineSplitDisabledReason(line: PayrollLineResponse): string | undefined {
  if (isLineSplitEditable(line)) return undefined;
  if (line.status === "excluded") {
    return (
      line.excluded_reason ??
      "Taşeron satırı bordrodan ödenmez; ödemesi taşeron hakedişi üzerinden yapılır."
    );
  }
  if (line.status === "paid") return "Satır ödendi; ödeme dağıtımı artık değiştirilemez.";
  if (line.status === "uncomputed") {
    return "Ücret verisi olmadığı için net tutar hesaplanamadı; bölüşülecek tutar yok.";
  }
  return "Bu satırın net tutarı hesaplanmadı.";
}

/**
 * `null` para alanı `""` olur — `0` DEĞİL. "0 ödenecek" ile "hesaplanamadı"
 * ayrımı şemanın açık kararıdır (S4) ve girdi kutusunda da korunur.
 */
export function amountFieldValue(value: string | null): string {
  return value ?? "";
}

/**
 * Kullanıcının yazdığı metni sunucuya gidecek DEĞERE çevirir.
 *
 * Boş metin `"0"`a düşer: iki alan BİRLİKTE gönderildiği için "boş" bir taraf
 * göndermek şemada `null` demektir ve `null` bölüşümü SİLERDİ; kullanıcının
 * kutuyu boşaltması "bu taraftan ödeme yok" demektir.
 *
 * Ondalık ayracı olarak virgül kabul edilir (tr-TR klavye) ve noktaya
 * çevrilir; sunucu `Decimal` ayrıştırır. ARİTMETİK YAPILMAZ — yalnız biçim
 * dönüşümü.
 */
export function toAmountPayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "0";
  return trimmed.replace(",", ".");
}

/** Girdiye izin verilen karakterler — negatif tutar bordroda anlamsızdır. */
export const AMOUNT_PATTERN = /^\d*[.,]?\d*$/;

export function isAmountInputValid(raw: string): boolean {
  return AMOUNT_PATTERN.test(raw.trim());
}

/* ----------------------------------------------------- işlem sonuç özeti */

export interface SkipCounter {
  label: string;
  count: number;
}

/**
 * Atlama sayaçlarını kullanıcıya gösterilecek cümleye çevirir (K7).
 * SIFIR olan sayaç YAZILMAZ — gürültü olurdu; ama sıfırdan büyük HER sayaç
 * mutlaka görünür (sessiz atlama yasağı).
 */
export function skipSummary(prefix: string, done: number, skips: readonly SkipCounter[]): string {
  const shown = skips.filter((skip) => skip.count > 0);
  const head = `${prefix}: ${done}`;
  if (shown.length === 0) return `${head}.`;
  const tail = shown.map((skip) => `${skip.count} ${skip.label}`).join(" · ");
  return `${head} · atlanan: ${tail}.`;
}
