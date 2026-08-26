import type { BadgeVariant } from "@/components/ui";
import type {
  FinancialInstrumentDirection,
  FinancialInstrumentKind,
  FinancialInstrumentStatus,
} from "@/lib/api/hooks/useFinancialInstruments";

import {
  BANK_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DRAWER_NAME_MAX_LENGTH,
  SERIAL_NO_MAX_LENGTH,
} from "./financial-instrument-form";

/**
 * F-FIN · `Ekran 10 - Finans Çek Ödeme.dc.html` (E10) TÜREV katmanı.
 * Parantez içi sayılar O dosyanın SATIR numaralarıdır.
 *
 * Bu dosya SAF'tır (React yok): sekme→süzgeç çevrimi ve rozet üçlüsü burada
 * yaşar, bileşenlerde `if (status === ...)` YAZILMAZ.
 */

/** İzin matrisi anahtarı — FIN-1 uçlarının kapısı `treasury` iznidir. */
export const FINANCIAL_INSTRUMENT_PERMISSION_MODULE = "treasury";

/** E10:94-96 sekmeleri. URL parametresi değerleridir; `alinan` VARSAYILANDIR. */
export type InstrumentTabKey = "alinan" | "verilen" | "senet";

export interface InstrumentTab {
  key: InstrumentTabKey;
  label: string;
  /** E10 satır numarası — mockup izlenebilirliği. */
  line: number;
}

/** E10:94-96 — sıra mockup'ın sırasıdır (K2). */
export const INSTRUMENT_TABS: readonly InstrumentTab[] = [
  { key: "alinan", label: "Alınan Çekler", line: 94 },
  { key: "verilen", label: "Verilen Çekler", line: 95 },
  { key: "senet", label: "Senetler", line: 96 },
];

/**
 * 🔴 ÜÇ SEKME AYRI UÇ DEĞİLDİR — `direction` + `instrument_kind` SÜZGECİDİR
 * (openapi: "E10:96 `Senetler` SUZGECTIR, ayri uc DEGIL").
 *
 * `Senetler` sekmesi YÖN SÜZMEZ: senet hem alınmış hem verilmiş olabilir ve
 * mockup bu sekmeyi yöne bölmez. Yönü de süzseydik verilen senetler hiçbir
 * sekmede GÖRÜNMEZ, sessizce kaybolurdu.
 */
export function instrumentTabFilter(tab: InstrumentTabKey): {
  direction?: FinancialInstrumentDirection;
  instrumentKind: FinancialInstrumentKind;
} {
  if (tab === "senet") return { instrumentKind: "promissory_note" };
  return {
    direction: tab === "verilen" ? "issued" : "received",
    instrumentKind: "cheque",
  };
}

/** Tanınmayan URL değeri VARSAYILANA düşer (E10'da ilk sekme etkin). */
export function instrumentTabFromParam(value: string | null): InstrumentTabKey {
  return INSTRUMENT_TABS.some((tab) => tab.key === value)
    ? (value as InstrumentTabKey)
    : "alinan";
}

/**
 * Rozetin ÜÇ tonu (E10:121 · 130/139 · 157) + mockup'ta çizilmeyen dördüncü
 * hâl. Ton yalnız rozeti değil VADE hücresinin rengini de sürer (E10:106/115
 * turuncu · E10:124/133 yeşil · E10:151 nötr) — iki yüzey TEK türevden gelsin.
 */
export type InstrumentTone = "due" | "portfolio" | "settled" | "closed";

export interface InstrumentBadge {
  tone: InstrumentTone;
  label: string;
  variant: BadgeVariant;
}

/**
 * 🔴 K3 — `is_due` TÜREV, `status` KALICI. "Vadede" bir enum üyesi DEĞİLDİR
 * (`FinancialInstrumentStatus` beşlisinde YOKTUR, şema bunu açıkça yazar):
 * `status === "portfolio"` **ve** `is_due` bileşimidir. `status` alanını
 * "vadede" diye okumaya çalışan her kod yanlıştır.
 *
 * `is_due` yalnız portföydeki bir kıymet için anlamlıdır: tahsil edilmiş bir
 * çekin vadesi geçmiş olabilir ama o artık portföyde değildir ve E10:157'de
 * MAVİ "Tahsil Edildi" basar, turuncu DEĞİL.
 *
 * Mockup'ta çizilmeyen üç durum (`paid`/`returned`/`cancelled`) SESSİZCE
 * ATLANMAZ: dördüncü kart "İade / İptal" (E10:85-89) o kayıtların var
 * olduğunu söylüyor. Nötr tonla basılırlar — E10:88'in gri (`#64748b`)
 * kart rengiyle aynı aile.
 */
export function instrumentBadge(
  status: FinancialInstrumentStatus,
  isDue: boolean,
): InstrumentBadge {
  if (status === "portfolio") {
    return isDue
      ? { tone: "due", label: "Vadede", variant: "warning" } // E10:121, 148
      : { tone: "portfolio", label: "Portföyde", variant: "success" }; // E10:130, 139
  }
  if (status === "collected") {
    return { tone: "settled", label: "Tahsil Edildi", variant: "primary" }; // E10:157
  }
  if (status === "paid") return { tone: "settled", label: "Ödendi", variant: "primary" };
  if (status === "returned") return { tone: "closed", label: "İade", variant: "neutral" };
  return { tone: "closed", label: "İptal", variant: "neutral" };
}

/**
 * 🔴 E10:104 "ÇEK NO" başlığı SEKMEYE BAĞLIDIR.
 *
 * Mockup YALNIZ çek sekmesini çizer; "Senetler" sekmesinde (E10:96) aynı sütun
 * senet numarası taşır (`SN-2026-0044`) ve sabit "Çek No" başlığı **ekranın
 * senede "çek" demesine** yol açıyordu. Kusuru dört kapının hiçbiri göremezdi
 * (mockup o sekmenin tablosunu çizmediği için karşılaştırılacak bir doğru
 * yoktu) — YALNIZ üretilen kareye bakmak yakaladı.
 *
 * 🔑 MEKANİZMA: başlık sekmeden DEĞİL, sekmenin sunucuya gönderdiği
 * `instrument_kind` SÜZGECİNDEN türer. Böylece süzgeç ile başlık **aynı tek
 * kaynaktan** gelir; biri değişip öteki bayatlayamaz (bir sekme ileride
 * senede süzülürse başlık kendiliğinden düzelir).
 *
 * Not: bu türev YALNIZ seri numarası sütununu kapsar. `Keşideci` ve `Banka`
 * her iki kıymet türü için de doğrudur ve DEĞİŞMEZ.
 */
export function instrumentSerialColumnLabel(tab: InstrumentTabKey): string {
  return instrumentTabFilter(tab).instrumentKind === "promissory_note"
    ? "Senet No"
    : "Çek No"; // E10:104
}

/* ══════════════ F-CEK · "Yeni Çek / Senet" formu (FCE) ══════════════════════
 * Kanonik mockup: `projedesign/Form - Cek Ekle.dc.html`. Sayılar O dosyanın
 * SATIR numaralarıdır. Metinler TEK yerde durur: aynı cümlenin ikinci kopyası
 * sessizce bayatlar (F-PRJTAB dersi).
 * ========================================================================= */

/** FCE:75 */
export const INSTRUMENT_FORM_TITLE = "Yeni Çek / Senet";
/** FCE:76 */
export const INSTRUMENT_FORM_LEAD = "Kayıt portföye eklenir";
/** FCE:106 */
export const INSTRUMENT_FORM_KIND_LABEL = "Tür";
/** FCE:114 */
export const INSTRUMENT_FORM_DIRECTION_LABEL = "Yön";
/** FCE:121 */
export const INSTRUMENT_FORM_COMPOSITION_LABEL = "Seçili bileşim:";
/** FCE:123 */
export const INSTRUMENT_FORM_COMPOSITION_NOTE =
  "Dört bileşim de geçerli — verilen senet dahil";
/** FCE:131 — sınır sözleşmeden gelir, metne elle SAYI yazılmaz. */
export const INSTRUMENT_FORM_SERIAL_HINT = `Maks ${SERIAL_NO_MAX_LENGTH} karakter`;
/** FCE:134 */
export const INSTRUMENT_FORM_AMOUNT_LABEL = "Tutar (₺)";
/** FCE:140 */
export const INSTRUMENT_FORM_DRAWER_LABEL = "Keşideci";
/** FCE:142 */
export const INSTRUMENT_FORM_DRAWER_HINT = `Maks ${DRAWER_NAME_MAX_LENGTH} karakter · Çeki düzenleyen kişi/kurum`;
/** FCE:148 */
export const INSTRUMENT_FORM_ISSUE_LABEL = "Keşide Tarihi";
/** FCE:152 */
export const INSTRUMENT_FORM_DUE_LABEL = "Vade";
/** FCE:161 */
export const INSTRUMENT_FORM_OPTIONAL_TITLE = "İsteğe Bağlı";
/** FCE:164 */
export const INSTRUMENT_FORM_BANK_LABEL = "Banka";
/**
 * 🔴 DENETİM SAPMASI 1 — mockup burada SABİT listeli bir `<select>` çizer
 * (FCE:165-170); sözleşmede `bank_name` SERBEST METİNDİR (`maxLength: 100`).
 * İpucu sınırı yazar ki kullanıcı 100. karakterde sürprizle karşılaşmasın.
 */
export const INSTRUMENT_FORM_BANK_HINT = `Serbest metin · maks ${BANK_NAME_MAX_LENGTH} karakter`;
/** FCE:173 */
export const INSTRUMENT_FORM_BANK_ACCOUNT_LABEL = "Banka Hesabı";
/** FCE:179 */
export const INSTRUMENT_FORM_BANK_ACCOUNT_HINT = "Tahsilat/ödeme bu hesaba işlenir";
/** FCE:183 */
export const INSTRUMENT_FORM_PROJECT_LABEL = "Proje";
/** FCE:185 */
export const INSTRUMENT_FORM_DESCRIPTION_LABEL = "Açıklama";
/**
 * 🔴 DENETİM SAPMASI 2 — sınır (200) mockup'ta ekranda YAZILI DEĞİLDİ; öteki
 * metin alanlarının hepsi sınırını yazıyor, bu alan yazmıyordu.
 */
export const INSTRUMENT_FORM_DESCRIPTION_HINT = `Maks ${DESCRIPTION_MAX_LENGTH} karakter`;
/** FCE:166/175 — "— Seçilmedi". */
export const INSTRUMENT_FORM_SELECT_PLACEHOLDER = "— Seçilmedi";
/** FCE:184 */
export const INSTRUMENT_FORM_PROJECT_PLACEHOLDER = "— Proje bağlantısı yok";
/** FCE:180 */
export const INSTRUMENT_FORM_STATUS_NOTE_TITLE = "Durum alanı yok:";
/** FCE:180-181 */
export const INSTRUMENT_FORM_STATUS_NOTE_BODY =
  "Yeni kayıt her zaman Portföyde olarak doğar. Tahsil/ödeme, ciro veya karşılıksız işlemleri liste ekranından yapılır.";
/** FCE:198 */
export const INSTRUMENT_FORM_CANCEL_LABEL = "İptal";
/** FCE:199 */
export const INSTRUMENT_FORM_SUBMIT_LABEL = "Kaydet";
export const INSTRUMENT_FORM_ERROR_FALLBACK = "Çek/senet kaydedilemedi.";

/**
 * FCE:129 — etiket SABİTTİR ve TÜRE BAĞLI DEĞİLDİR.
 *
 * 🔴 E10 TABLOSUNDAKİ kural (`instrumentSerialColumnLabel`) burada GEÇERSİZDİR
 * ve kopyalanmadı: orada başlık sabit "Çek No"ydu ve senet sekmesinde ekranın
 * senede "çek" demesine yol açıyordu. Mockup'ın FORM etiketi ise ZATEN her iki
 * türü de kapsıyor ("Çek / Senet No") — türe göre değiştirmek mockup'ta
 * OLMAYAN bir davranış İCAT ETMEK olurdu (%100 mockup sadakati, WORKFLOW §3).
 */
export const INSTRUMENT_FORM_SERIAL_LABEL = "Çek / Senet No";
