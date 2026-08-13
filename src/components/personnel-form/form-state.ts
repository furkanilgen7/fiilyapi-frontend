import type { PersonnelDetailResponse } from "@/lib/api/hooks/usePersonnelDetail";
import type { Gender, MaritalStatus, PaymentMethod, WageType, WorkerSource } from "./constants";
import { PAYMENT_METHOD_OPTIONS, WAGE_TYPE_OPTIONS } from "./constants";

/**
 * Formun DURUM TAŞIYAN alanları.
 *
 * ⚠️ KORUMA (F-İK T4'te DARALDI ama KALKMADI): bir alanın burada karşılığı
 * OLMASI, sunucu sözleşmesinde (`PersonnelCreate`/`PersonnelUpdate`) karşılığı
 * OLDUĞU anlamına gelir. Karşılığı olmayan mockup alanları (fotoğraf, belgeler,
 * SGK bildirge kutucuğu, **Bölüm**) burada YOKTUR — değer tutulmadığı için
 * gövdeye sızmaları FİZİKSEL OLARAK imkânsızdır. İki gövde de
 * `additionalProperties: false` taşır: fazladan tek anahtar 422 demektir.
 */
export interface PersonnelFormValues {
  /** PE 63 — `full_name`in ilk parçası. */
  firstName: string;
  /** PE 64 — `full_name`in ikinci parçası. */
  lastName: string;
  /**
   * PE 91 → `source`. Boş dize = "Seçiniz...". Oluşturma kipinde yalnız
   * `WorkerSource` değeri tutulabilir (karşılıksız seçenekler devre-dışı);
   * düzenleme kipinde eski bir `general` kaydı SEED edilebilir (JobCard bu
   * değeri özel — seçilemeyen ama SİLİNMEYEN — bir seçenek olarak basar).
   */
  source: WorkerSource | "";
  /** PE 95 → `subcontractor_id`. Yalnız `source === "subcontractor"` iken dolu. */
  subcontractorId: string;
  /** PE 99 → `trade` (seçilen ETİKET metni). */
  trade: string;
  /**
   * F-PT2 T3 (spec K2) — `is_active`. Mockup'ta karşılığı YOK, yalnız
   * DÜZENLEME kipinde gösterilir/değiştirilebilir; oluşturma kipinde `true`.
   */
  isActive: boolean;

  /* ── F-İK T4 · Kimlik (PE 65-68) → İK-1 sözleşmesi ────────────────────── */
  /** PE 65 → `tc_no`. Geçerlilik SUNUCUDA denetlenir (checksum istemcide YOK). */
  tcNo: string;
  /** PE 66 → `birth_date` (ISO `YYYY-MM-DD`, `<input type="date">` biçimi). */
  birthDate: string;
  /** PE 67 → `gender`. Boş dize = "Seçiniz..." → gövdede `null`. */
  gender: Gender | "";
  /** PE 68 → `marital_status`. Boş dize = "Seçiniz..." → gövdede `null`. */
  maritalStatus: MaritalStatus | "";

  /* ── İletişim (PE 77-81) ──────────────────────────────────────────────── */
  /** PE 77 → `phone`. */
  phone: string;
  /** PE 78 → `email`. */
  email: string;
  /** PE 79 → `address`. */
  address: string;
  /** PE 80 → `emergency_contact_name`. */
  emergencyContactName: string;
  /** PE 81 → `emergency_contact_phone`. */
  emergencyContactPhone: string;

  /* ── İş / ücret (PE 101-117) ──────────────────────────────────────────── */
  /** PE 101 → `hire_date`. */
  hireDate: string;
  /** PE 103-104 → `assigned_project_id`. Seçenekler GERÇEK proje listesinden. */
  assignedProjectId: string;
  /**
   * PE 113 → `wage_type`. Mockup'ta "Seçiniz..." YOKTUR ve ilk seçenek
   * ("Günlük") seçilidir; form durumu mockup'ın GÖSTERDİĞİ değerle başlar.
   */
  wageType: WageType | "";
  /** PE 114 → `wage_amount` (sunucu `number | ondalık dize` kabul eder). */
  wageAmount: string;
  /** PE 115 → `payment_method`. `wageType` ile AYNI gerekçe: varsayılan dolu. */
  paymentMethod: PaymentMethod | "";
  /** PE 116 → `iban`. */
  iban: string;
  /** PE 117 → `sgk_no`. */
  sgkNo: string;
}

export function emptyPersonnelFormValues(): PersonnelFormValues {
  return {
    firstName: "",
    lastName: "",
    source: "",
    subcontractorId: "",
    trade: "",
    isActive: true,
    tcNo: "",
    birthDate: "",
    gender: "",
    maritalStatus: "",
    phone: "",
    email: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    hireDate: "",
    assignedProjectId: "",
    // Mockup'ta bu iki seçicinin "Seçiniz..." seçeneği YOKTUR; ekranda görünen
    // ilk seçenek neyse form durumu da odur (görünenle kaydedilen ayrışmaz).
    wageType: WAGE_TYPE_OPTIONS[0].value,
    wageAmount: "",
    paymentMethod: PAYMENT_METHOD_OPTIONS[0].value,
    iban: "",
    sgkNo: "",
  };
}

/** `full_name`i İLK BOŞLUKTAN ikiye böler — sunucu ayrı ad/soyad TAŞIMAZ. */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

/**
 * Düzenleme kipinde mevcut personelden form değerlerini doldurur
 * (`SectionForm`'un `sectionFormValuesFromDetail` deseniyle AYNI).
 *
 * ⚠️ `wage_type`/`payment_method` sunucuda `null` olabilir; mockup bu iki
 * seçicide boş seçenek TAŞIMADIĞI için ekranda ilk seçenek görünür ve
 * kaydedilen de odur — görünenle gönderilen ayrışmaz.
 */
export function personnelFormValuesFromDetail(
  detail: PersonnelDetailResponse,
): PersonnelFormValues {
  const { firstName, lastName } = splitFullName(detail.full_name);
  return {
    firstName,
    lastName,
    source: detail.source,
    subcontractorId: detail.subcontractor_id ?? "",
    trade: detail.trade ?? "",
    isActive: detail.is_active,
    tcNo: detail.tc_no ?? "",
    birthDate: detail.birth_date ?? "",
    gender: detail.gender ?? "",
    maritalStatus: detail.marital_status ?? "",
    phone: detail.phone ?? "",
    email: detail.email ?? "",
    address: detail.address ?? "",
    emergencyContactName: detail.emergency_contact_name ?? "",
    emergencyContactPhone: detail.emergency_contact_phone ?? "",
    hireDate: detail.hire_date ?? "",
    assignedProjectId: detail.assigned_project_id ?? "",
    wageType: detail.wage_type ?? WAGE_TYPE_OPTIONS[0].value,
    wageAmount: detail.wage_amount ?? "",
    paymentMethod: detail.payment_method ?? PAYMENT_METHOD_OPTIONS[0].value,
    iban: detail.iban ?? "",
    sgkNo: detail.sgk_no ?? "",
  };
}
