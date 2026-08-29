/**
 * F-UNIT1 · BE (`Form - Blok Ekle.dc.html`) — "Yeni Blok Ekle" formunun
 * sabitleri. Parantez içi `BE nn` O DOSYANIN satır numarasıdır.
 *
 * UI metni Türkçe ve mockup'tan BİREBİR kopyalanır; renk/ölçü kararları
 * token'dır (çıplak hex yazılmaz).
 */

import type { components } from "@/lib/api/schema";
import { routes } from "@/lib/routes";

export type BlockRoofType = components["schemas"]["BlockRoofType"];
export type BlockGroundUsage = components["schemas"]["BlockGroundUsage"];
export type BlockParkingType = components["schemas"]["BlockParkingType"];
export type BlockStatus = components["schemas"]["BlockStatus"];

export const BLOCK_FORM_TITLE = "Yeni Blok Ekle"; // BE 55
export const BLOCK_FORM_SUBTITLE =
  "Blok bir şantiyeye bağlıdır — çok şantiyeli projelerde şantiye seçimi zorunludur"; // BE 56

export const BLOCK_INFO_CARD_TITLE = "Blok Bilgileri"; // BE 59
export const BLOCK_STRUCTURE_CARD_TITLE = "Yapı Bilgileri"; // BE 76
export const BLOCK_EXTRA_CARD_TITLE = "Ek Bilgiler"; // BE 98

export const BLOCK_SUBMIT_LABEL = "Bloğu Kaydet"; // BE 113
export const BLOCK_CANCEL_LABEL = "İptal"; // BE 112

/** İptal/başarı dönüşü — kabuk canonu (mockup kendi üst barını çizmez). */
export const UNITS_LIST_HREF = routes.sales.root();

/**
 * Sunucu sözleşmesinin uzunluk sınırları (`units/schemas.py::_BlockFormFields`).
 * Kutulara `maxLength` olarak basılır: sessiz 422 sınıfı böyle kapanır.
 */
export const BLOCK_NAME_MAX_LENGTH = 50; // BE 70
export const BLOCK_CODE_MAX_LENGTH = 20; // BE 71
export const BLOCK_NOTES_MAX_LENGTH = 500; // BE 102

/** BE 68 — mockup "Bu projede 2 şantiye var" der; sayı ÇALIŞMA ZAMANINDA gelir. */
export const BLOCK_SITE_HINT_SUFFIX = "şantiye var — seçim zorunlu";

/**
 * BE 68 ipucunun tam cümlesi. Mockup'ın "2"si O PROJENİN o günkü şantiye
 * sayısıdır; sabitlenirse tek şantiyeli bir projede de "2 şantiye var" yazardı.
 * Liste henüz gelmemişken (0) ipucu HİÇ basılmaz — sıfır bir sayı iddiasıdır.
 */
export function blockSiteHint(siteCount: number): string | null {
  return siteCount > 0 ? `Bu projede ${siteCount} ${BLOCK_SITE_HINT_SUFFIX}` : null;
}

/**
 * PATH parametresi eksikken kaydetme denemesinin GÖRÜNÜR gerekçesi.
 *
 * 🔴 KARAR 11'in İSTİSNASI DEĞİLDİR: karar GÖVDE ALANLARI içindir ("hiçbir alan
 * zorunlu değil"), oysa `project_id` gövdede değil YOLDADIR. Boşken istek
 * `/projects//blocks` olur, fetch onu `/projects/blocks`e normalize eder ve
 * backend 422 döner — kullanıcı sebebini ASLA öğrenemeyeceği bir hata görür
 * (F-P5'te canlı smoke'ta yakalanan kusur sınıfı). Bu yüzden istek hiç
 * kurulmaz, yerine bu cümle basılır.
 */
export const BLOCK_PROJECT_REQUIRED_MESSAGE =
  "Önce bir proje seçin — blok kaydı projenin altına yazılır.";

/** Sunucu hatası için genel yedek metin. */
export const BLOCK_SAVE_ERROR_FALLBACK = "Blok kaydedilemedi.";
export const BLOCK_CODE_HINT = "Boş bırakılırsa otomatik"; // BE 71
export const BLOCK_UNITS_PER_FLOOR_HINT = "Toplu üretimde kullanılır"; // BE 81

export interface BlockOption<TValue extends string> {
  value: TValue;
  label: string;
}

/**
 * BE 80 "Çatı Katı". 🔴 Boş seçeneği YOKTUR — bu yüzden `roof_type`
 * DOKUNMA KAPISINA girer (`build-body.ts`): `none` ("Yok") gerçek bir enum
 * değeridir, "belirtilmedi" DEĞİLDİR.
 */
export const ROOF_TYPE_OPTIONS: readonly BlockOption<BlockRoofType>[] = [
  { value: "none", label: "Yok" }, // BE 80
  { value: "duplex", label: "Var (Dubleks)" }, // BE 80
  { value: "terrace", label: "Var (Teras)" }, // BE 80
];

/** BE 82 "Zemin Kat Kullanımı" — boş seçenek YOK → dokunma kapısı. */
export const GROUND_FLOOR_USAGE_OPTIONS: readonly BlockOption<BlockGroundUsage>[] = [
  { value: "commercial", label: "Dükkan / Ticari" }, // BE 82
  { value: "apartment", label: "Daire" }, // BE 82
  { value: "common", label: "Ortak Alan" }, // BE 82
];

/** BE 86 "Otopark" — boş seçenek YOK → dokunma kapısı. */
export const PARKING_TYPE_OPTIONS: readonly BlockOption<BlockParkingType>[] = [
  { value: "closed", label: "Kapalı Otopark" }, // BE 86
  { value: "open", label: "Açık Otopark" }, // BE 86
  { value: "none", label: "Yok" }, // BE 86
];

/** BE 101 "Durum" — mockup'ta `selected` olan "İnşaat Halinde"dir. */
export const BLOCK_STATUS_OPTIONS: readonly BlockOption<BlockStatus>[] = [
  { value: "planning", label: "Planlama" }, // BE 101
  { value: "construction", label: "İnşaat Halinde" }, // BE 101
  { value: "completed", label: "Tamamlandı" }, // BE 101
];

/** BE 90 türev paneli. */
export const BLOCK_ESTIMATE_TITLE = "Tahmini Toplam Ünite"; // BE 90
/** Üç girdi de boşken panelde basılan metin — "0" YAZILMAZ (bkz. `estimate.ts`). */
export const BLOCK_ESTIMATE_EMPTY = "—";

/**
 * BE 109 "Kaydettikten sonra toplu ünite üretimine geç".
 *
 * 🔴 F-UNIT2 T2c İTİBARIYLA GERÇEKTİR. Hedefi (`/satis/toplu-uretim`) T2a'da
 * açıldı, bu yüzden `BLOCK_BULK_UNITS_PENDING_REASON` KALDIRILDI: ekran canlıyken
 * "henüz açılmadı" diyen bir gerekçe kullanıcıya YALAN söylerdi (sekme şeridinin
 * türev gerekçesiyle aynı çürüme sınıfı — orada kendiliğinden kalkıyor, burada
 * elle kaldırıldı çünkü sabit bir cümleydi).
 *
 * 🔴 KUTUCUK BİR GEZİNME BAYRAĞIDIR, GÖVDE ALANI DEĞİL. İşaretliyken kayıt
 * başarılı olursa kullanıcı toplu üretim ekranına `?proje=…&blok=…` bağlamıyla
 * götürülür; `build-body.ts` bu alanı HİÇ okumaz ve `build-body.test.ts` gövdeye
 * sızmadığını adlı bir testle kapıya bağlar (`projectId` ile aynı sınıf: durumda
 * yaşar, gövdede yaşamaz).
 */
export const BLOCK_BULK_UNITS_LABEL = "Kaydettikten sonra toplu ünite üretimine geç"; // BE 109
