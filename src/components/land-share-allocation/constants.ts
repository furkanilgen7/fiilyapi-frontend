/**
 * F-UNIT2 · PG (`Form - Paylasim Girisi.dc.html`) — "Kat Karşılığı Paylaşım
 * Girişi" ekranının sabitleri. Parantez içi `PG nn` O DOSYANIN satırıdır.
 */

import { SALES_LIST_HREF } from "@/components/unit-shell/routes";
import { formatPercent } from "@/lib/format";

export const ALLOCATION_FORM_TITLE = "Kat Karşılığı Paylaşım Girişi"; // PG 53
export const ALLOCATION_FORM_SUBTITLE =
  "Her üniteyi arsa sahibi veya yüklenici payı olarak işaretleyin — toplu seçim yapabilirsiniz"; // PG 54

export const ALLOCATION_TARGET_CARD_TITLE = "Sözleşme & Hedef"; // PG 58
export const ALLOCATION_BULK_BAR_TITLE = "Toplu İşlem"; // PG 88
export const ALLOCATION_BALANCE_CARD_TITLE = "Paylaşım Denge Kontrolü"; // PG 245

export const ALLOCATION_PROJECT_LABEL = "Proje"; // PG 60 — PATH parametresi
export const ALLOCATION_CONTRACT_LABEL = "Kat Karşılığı Sözleşmesi"; // PG 61 — SALT OKUNUR
export const ALLOCATION_BLOCK_FILTER_LABEL = "Blok Filtresi"; // PG 62 — SÜZGEÇ

export const ALLOCATION_CONTRACT_RATIO_TITLE = "Sözleşme Oranı"; // PG 66
export const ALLOCATION_CURRENT_STATE_TITLE = "Mevcut Atama Durumu"; // PG 74

export const ALLOCATION_ASSIGN_SELECTED_LABEL = "Seçilenleri şuna ata:"; // PG 91
export const ALLOCATION_ASSIGN_CONTRACTOR_LABEL = "Yüklenici (Biz)"; // PG 92
export const ALLOCATION_ASSIGN_LANDOWNER_LABEL = "Arsa Sahibi"; // PG 93
export const ALLOCATION_SHAREHOLDER_PLACEHOLDER = "Hissedar seç (arsa payı için)"; // PG 96
export const ALLOCATION_SELECT_ALL_LABEL = "Tümünü Seç"; // PG 109

/** PG 112-115 — üç enum üyesi + süzgeçsiz "Tümü". */
export const ALLOCATION_FILTER_UNASSIGNED_LABEL = "Atanmayan"; // PG 112
export const ALLOCATION_FILTER_ALL_LABEL = "Tümü"; // PG 113
export const ALLOCATION_FILTER_CONTRACTOR_LABEL = "Bizim"; // PG 114
export const ALLOCATION_FILTER_LANDOWNER_LABEL = "Arsa"; // PG 115

/** PG 121-127 tablo başlıkları — `LandShareUnitRow` alanlarıyla BİREBİR. */
export const ALLOCATION_ROW_COLUMN_LABELS: readonly string[] = [
  "Ünite", // PG 121
  "Kat", // PG 122
  "Tip", // PG 123
  "Brüt m²", // PG 124
  "Rayiç Değer", // PG 125 — `appraisal_value`
  "Sahiplik Ataması", // PG 126
  "Hissedar", // PG 127
];

/** PG 140/141 satır içi ikili düğme; PG 144/190 sağdaki durum metinleri. */
export const ALLOCATION_CONTRACTOR_LABEL = "Biz"; // PG 140
export const ALLOCATION_LANDOWNER_LABEL = "Arsa"; // PG 141
export const ALLOCATION_UNASSIGNED_LABEL = "Atanmadı"; // PG 144
export const ALLOCATION_CONTRACTOR_ROW_NOTE = "Yüklenici payı"; // PG 190

/** PG 248-252 · 256-260 denge kartları. */
export const ALLOCATION_COUNT_BALANCE_TITLE = "Ünite Sayısı Dengesi"; // PG 248
export const ALLOCATION_VALUE_BALANCE_TITLE = "Değer Dengesi (Rayiç)"; // PG 256
export const ALLOCATION_ASSIGNED_NOW_LABEL = "Şu an atanan"; // PG 251
export const ALLOCATION_MISSING_LABEL = "Eksik"; // PG 252
export const ALLOCATION_OUR_VALUE_LABEL = "Bize atanan değer"; // PG 258
export const ALLOCATION_OWNER_VALUE_LABEL = "Arsa sahibine atanan"; // PG 259
export const ALLOCATION_ACTUAL_RATIO_LABEL = "Gerçekleşen oran"; // PG 260

export const ALLOCATION_SUBMIT_LABEL = "Paylaşımı Kaydet"; // PG 276
export const ALLOCATION_CANCEL_LABEL = "İptal"; // PG 275

/**
 * PG 275'in hedefi `Kat Karşılığı - Paylaşım.dc.html`tır — O EKRAN AYRIDIR ve
 * bu dilimin kapsamı dışındadır (F-PKK'nın işi). Rota henüz yok, bu yüzden
 * kabuk canonuna dönülür (F-UNIT1 emsali).
 */
export const ALLOCATION_CANCEL_HREF = SALES_LIST_HREF;

/**
 * 🔴 PG 101 "Otomatik Dağıt (%55/%45)" — ORAN ÖRNEK VERİDİR, SABİT DEĞİL.
 * Mockup'ın sayıları kopyalanıp sabitlenirse %60/%40 sözleşmeli bir projede
 * düğme YANLIŞ oran vaat eder. Etiket `LandShareContract.our_share_pct` /
 * `.owner_share_pct` alanlarından TÜRETİLİR.
 */
export function autoDistributeLabel(ourPct: string, ownerPct: string): string {
  return `Otomatik Dağıt (${formatPercent(ourPct)}/${formatPercent(ownerPct)})`;
}

/**
 * 🔴 PG 270-272 "Paylaşım tutanağı PDF olarak oluştur" — SUNUCUDA KARŞILIĞI
 * YOKTUR (ne `UnitAllocationRequest` gövdesinde ne ayrı bir uçta; ölçüldü).
 * Kanon: rotası/ucu olmayan mockup öğesi SİLİNMEZ — devre dışı + işaretsiz +
 * GÖRÜNÜR gerekçeyle basılır. `allocation-state.ts`te karşılığı OLMADIĞI için
 * gövdeye sızması yapısal olarak imkânsızdır (F-UNIT1'in BE 109 kutucuğuyla
 * aynı muamele).
 */
export const ALLOCATION_PDF_LABEL =
  "Paylaşım tutanağı PDF olarak oluştur (arsa sahibi imzası için)"; // PG 272
export const ALLOCATION_PDF_PENDING_REASON =
  "Paylaşım tutanağı çıktısı henüz yok — sunucuda tutanak üreten bir uç açılmadı";

/** `schemas.py::_MAX_ALLOCATION_ITEMS` — tek istekte en fazla bu kadar satır. */
export const ALLOCATION_MAX_ITEMS = 500;

/**
 * 🔴 `LandShareValueBalance`ın dört alanı `None` olabilir ve bu
 * "HESAPLANAMAZ"dır, "sıfır" DEĞİL: `0` basmak ekrana "denge uygun"
 * yazdırırdı (sunucunun kendi yorumu). Eşik (`tolerance_pct`) de SUNUCUDAN
 * gelir; istemci onu KOPYALAMAZ — bir eşik iki yerde yaşarsa ayrışır.
 */
export const ALLOCATION_UNCOMPUTABLE = "—";

/**
 * `UnitAllocationRequest.items` sunucuda `min_length=1`dir: değişmemiş bir
 * ekrandan boş liste göndermek 422 üretirdi. Kaydet düğmesi kapalı basılır ve
 * sebebi GÖRÜNÜR olur.
 */
export const ALLOCATION_NO_CHANGES_MESSAGE =
  "Kaydedilecek bir değişiklik yok — önce ünitelerin sahiplik atamasını değiştirin";

/** Rayiç değeri olmayan üniteler otomatik dağıtıma GİREMEZ (bkz. `auto-distribute.ts`). */
export const ALLOCATION_SKIPPED_WITHOUT_VALUE_MESSAGE =
  "Rayiç değeri girilmemiş üniteler otomatik dağıtıma alınmadı — bunları elle atayın";

/** Hedefler dolduğu için dağıtılamayan üniteler. */
export const ALLOCATION_LEFT_UNASSIGNED_MESSAGE =
  "Sözleşme oranı doldu — kalan üniteler atanmadan bırakıldı";
