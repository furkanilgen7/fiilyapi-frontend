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

/** Boş/boşluk dizesi `null`a düşer — sunucuya "" yazmak veri değil gürültüdür. */
function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * İki gövdenin ORTAK alan eşlemesi (DRY: create ve update aynı haritayı
 * kullanır, tek kopya kayması olmaz).
 *
 * ÜRETİLEN ANAHTARLAR:
 *   • `full_name`  ← Ad (PE 63) + " " + Soyad (PE 64)
 *   • `trade`      ← Meslek / Görev (PE 99) seçilen ETİKET metni
 *   • `source`     ← Çalışan Tipi (PE 91)
 *   • `is_active`  ← yalnız düzenleme kipinde görünen kutucuk; oluşturmada `true`
 *   • İK-1 alanları: `tc_no` · `birth_date` · `gender` · `marital_status` ·
 *     `phone` · `email` · `address` · `emergency_contact_name` ·
 *     `emergency_contact_phone` · `hire_date` · `wage_type` · `wage_amount` ·
 *     `payment_method` · `iban` · `sgk_no` · `assigned_project_id`
 *
 * BİLİNÇLİ OLARAK GÖNDERİLMEYENLER (form durumunda karşılıkları bile yok):
 *   • `user_id` → mockup'ta karşılığı yok.
 *   • `assigned_section_id` → "Bölüm" (PE 107-108) DEVRE-DIŞI: sunucuda proje
 *     düzeyinde bölüm listeleyen bir yol yok. PATCH'te anahtar HİÇ
 *     gönderilmediği için mevcut değer sunucuda OLDUĞU GİBİ kalır — form
 *     seçemediği bir alanı SİLMEZ.
 *   • Fotoğraf · belgeler · SGK bildirge kutucuğu.
 */
function commonFields(values: SubmittablePersonnelFormValues) {
  return {
    full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    trade: textOrNull(values.trade),
    source: values.source,
    is_active: values.isActive,
    tc_no: textOrNull(values.tcNo),
    birth_date: textOrNull(values.birthDate),
    gender: values.gender === "" ? null : values.gender,
    marital_status: values.maritalStatus === "" ? null : values.maritalStatus,
    phone: textOrNull(values.phone),
    email: textOrNull(values.email),
    address: textOrNull(values.address),
    emergency_contact_name: textOrNull(values.emergencyContactName),
    emergency_contact_phone: textOrNull(values.emergencyContactPhone),
    hire_date: textOrNull(values.hireDate),
    wage_type: values.wageType === "" ? null : values.wageType,
    wage_amount: textOrNull(values.wageAmount),
    payment_method: values.paymentMethod === "" ? null : values.paymentMethod,
    iban: textOrNull(values.iban),
    sgk_no: textOrNull(values.sgkNo),
    assigned_project_id: textOrNull(values.assignedProjectId),
  };
}

/**
 * `POST /personnel` gövdesi.
 *
 * `is_draft` ÇAĞIRANDAN gelir (spec K4): "Taslak Kaydet" → `true`,
 * "Personeli Kaydet" → `false`. Sabit değildir — hangi düğmeye basıldığı
 * kaydın yayın durumunu belirleyen TEK şeydir.
 *
 * `is_active` ve `is_draft` açıkça gönderilir çünkü üretilen sözleşmede
 * varsayılanı olan alanlar ZORUNLU tiplenir (`SiteCreate.is_draft` ile aynı).
 */
export function buildPersonnelCreateBody(
  values: SubmittablePersonnelFormValues,
  options: { isDraft: boolean },
): PersonnelCreateBody {
  // Taşeron kimliği YALNIZ taşeron işçisinde taşınır. Kullanıcı önce "Taşeron
  // İşçisi" + firma seçip sonra "Şirket Kadrosu"na dönerse seçim durumda
  // temizlenir (`PersonnelForm`), burada İKİNCİ kez de süzülür: tek
  // korumaya güvenmek bu alanın sessizce sızması demekti.
  const subcontractorId =
    values.source === "subcontractor" ? values.subcontractorId.trim() : "";

  return {
    ...commonFields(values),
    is_draft: options.isDraft,
    ...(subcontractorId ? { subcontractor_id: subcontractorId } : {}),
  };
}

/**
 * `PATCH /personnel/{personnel_id}` gövdesi — F-PT2 T3, F-P6 iki-kip emsali.
 *
 * ⚠️ `subcontractor_id` PATCH'te KISMİ GÜNCELLEMEDİR: gönderilmeyen alan
 * sunucuda OLDUĞU GİBİ kalır. Kullanıcı taşeron işçisinden şirket kadrosuna
 * dönerse anahtar HİÇ göndermemek eski taşeron kimliğini backend'de SESSİZCE
 * bırakırdı — bu yüzden burada (create'in aksine) `subcontractor_id` HER
 * ZAMAN gönderilir: dolu değer ya da açıkça `null`.
 *
 * ⚠️ `is_draft` (spec K4): `options.isDraft === null` iken anahtar HİÇ
 * BASILMAZ. Yayındaki bir kaydı düzenlemek onu sessizce taslağa DÜŞÜRMEZ ve
 * taslak bir kaydı düzenlemek sessizce YAYINLAMAZ; durum yalnız kullanıcı
 * açıkça "Yayına Al" / "Taslak Kaydet" düğmesine bastığında değişir.
 */
export function buildPersonnelUpdateBody(
  values: SubmittablePersonnelFormValues,
  options: { isDraft: boolean | null },
): PersonnelUpdateBody {
  const subcontractorId =
    values.source === "subcontractor" ? values.subcontractorId.trim() : "";

  return {
    ...commonFields(values),
    subcontractor_id: subcontractorId || null,
    ...(options.isDraft === null ? {} : { is_draft: options.isDraft }),
  };
}
