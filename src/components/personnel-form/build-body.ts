import type { components } from "@/lib/api/schema";
import type { WorkerSource } from "./constants";
import type { PersonnelFormValues } from "./form-state";

export type PersonnelCreateBody = components["schemas"]["PersonnelCreate"];
export type PersonnelUpdateBody = components["schemas"]["PersonnelUpdate"];

/**
 * Gönderilebilir form değerleri: `source` ARTIK boş olamaz.
 *
 * Daraltma TİPTE yapılır ki gövde derleyicisi boş seçimi sessizce bir
 * varsayılana ("general") düşürmek zorunda kalmasın — o düşüş tam da
 * kaçınılmak istenen sessiz veri kaybıydı. Daraltmayı `submittableValues`
 * yapar ve doğrulama geçmeden `null` döner.
 */
export interface SubmittablePersonnelFormValues extends Omit<PersonnelFormValues, "source"> {
  source: WorkerSource;
}

/** Doğrulanmış değerleri gönderilebilir tipe daraltır; `source` boşsa `null`. */
export function submittableValues(
  values: PersonnelFormValues,
): SubmittablePersonnelFormValues | null {
  if (values.source === "") return null;
  return { ...values, source: values.source };
}

/**
 * `POST /personnel` gövdesi — saf fonksiyon (şef kararı: alan eşlemesi).
 *
 * ÜRETİLEN ANAHTARLAR (başkası YOK):
 *   • `full_name`  ← Ad (63) + " " + Soyad (64)
 *   • `trade`      ← Meslek / Görev (99) seçilen ETİKET metni
 *   • `source`     ← Çalışan Tipi (91) → `company` | `subcontractor`
 *   • `subcontractor_id` ← Bağlı Taşeron (95), YALNIZ `source === "subcontractor"`
 *   • `is_active`  ← formda alan YOKTUR, HER ZAMAN `true` gider.
 *
 * `is_active` neden açıkça gönderiliyor: üretilen sözleşmede (schema.d.ts)
 * varsayılanı olan alanlar ZORUNLU tiplenir — `SiteCreate.is_draft` ile aynı
 * durum. Değeri sabittir; formdan gelen bir veri DEĞİLDİR.
 *
 * BİLİNÇLİ OLARAK GÖNDERİLMEYENLER:
 *   • `user_id`   → mockup'ta karşılığı yok.
 *   • Mockup'ın devre-dışı alanlarının HİÇBİRİ (TC, doğum tarihi, cinsiyet,
 *     medeni durum, telefon, e-posta, adres, acil durum, işe giriş tarihi,
 *     proje, bölüm, ücret, IBAN, SGK sicil, fotoğraf, belgeler).
 *
 * `PersonnelCreate` `additionalProperties: false` taşır: fazladan tek anahtar
 * 422 döndürür. Sızıntı kapısı `build-body.test.ts`tedir.
 */
export function buildPersonnelCreateBody(
  values: SubmittablePersonnelFormValues,
): PersonnelCreateBody {
  const { source } = values;

  // Taşeron kimliği YALNIZ taşeron işçisinde taşınır. Kullanıcı önce "Taşeron
  // İşçisi" + firma seçip sonra "Şirket Kadrosu"na dönerse seçim durumda
  // temizlenir (`PersonnelForm`), burada İKİNCİ kez de süzülür: tek
  // korumaya güvenmek bu alanın sessizce sızması demekti.
  const subcontractorId = source === "subcontractor" ? values.subcontractorId.trim() : "";

  return {
    full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    trade: values.trade.trim() || null,
    source,
    is_active: true,
    ...(subcontractorId ? { subcontractor_id: subcontractorId } : {}),
  };
}

/**
 * `PATCH /personnel/{personnel_id}` gövdesi — F-PT2 T3, F-P6 iki-kip emsali.
 *
 * `buildPersonnelCreateBody`ten TEK farkı: `is_active` sabit `true` DEĞİL,
 * formun (yalnız düzenleme kipinde gösterilen) `isActive` alanından gelir —
 * spec K2 "is_active düzenlenebilir".
 *
 * ⚠️ `subcontractor_id` PATCH'te KISMİ GÜNCELLEMEDİR: gönderilmeyen alan
 * sunucuda OLDUĞU GİBİ kalır. Kullanıcı taşeron işçisinden şirket kadrosuna
 * dönerse anahtar HİÇ göndermemek eski taşeron kimliğini backend'de SESSİZCE
 * bırakırdı — bu yüzden burada (create'in aksine) `subcontractor_id` HER
 * ZAMAN gönderilir: dolu değer ya da açıkça `null`.
 *
 * ÜRETİLEN ANAHTARLAR (başkası YOK, create ile AYNI liste + her zaman
 * `subcontractor_id`): `full_name` · `trade` · `source` · `subcontractor_id`
 * · `is_active`. Pending alanların (kimlik/iletişim/ücret/…) HİÇBİRİ
 * gövdeye sızmaz — form durumunda karşılıkları yok (`form-state.ts`).
 */
export function buildPersonnelUpdateBody(
  values: SubmittablePersonnelFormValues,
): PersonnelUpdateBody {
  const { source } = values;
  const subcontractorId = source === "subcontractor" ? values.subcontractorId.trim() : "";

  return {
    full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    trade: values.trade.trim() || null,
    source,
    subcontractor_id: subcontractorId || null,
    is_active: values.isActive,
  };
}
