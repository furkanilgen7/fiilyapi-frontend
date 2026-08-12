import type { PersonnelDetailResponse } from "@/lib/api/hooks/usePersonnelDetail";
import type { WorkerSource } from "./constants";

/**
 * Formun DURUM TAŞIYAN alanları.
 *
 * ⚠️ EN ÖNEMLİ KORUMA: mockup'taki devre-dışı alanların (TC, doğum tarihi,
 * telefon, IBAN, ücret, belge…) burada KARŞILIĞI YOKTUR. Değer tutulmadığı
 * için gövdeye sızması FİZİKSEL OLARAK imkânsızdır — `PersonnelCreate`/
 * `PersonnelUpdate` `additionalProperties: false` taşır, fazladan tek anahtar
 * 422 demektir. Bu dosyaya yeni alan eklemek, o alanın sunucu sözleşmesinde
 * karşılığı OLDUĞU anlamına gelir.
 */
export interface PersonnelFormValues {
  /** Mockup 63 — `full_name`in ilk parçası. */
  firstName: string;
  /** Mockup 64 — `full_name`in ikinci parçası. */
  lastName: string;
  /**
   * Mockup 91 → `source`. Boş dize = "Seçiniz...". Oluşturma kipinde yalnız
   * `WorkerSource` değeri tutulabilir (karşılıksız seçenekler devre-dışı);
   * düzenleme kipinde eski bir `general` kaydı SEED edilebilir (JobCard bu
   * değeri özel — seçilemeyen ama SİLİNMEYEN — bir seçenek olarak basar).
   */
  source: WorkerSource | "";
  /** Mockup 95 → `subcontractor_id`. Yalnız `source === "subcontractor"` iken dolu. */
  subcontractorId: string;
  /** Mockup 99 → `trade` (seçilen ETİKET metni). */
  trade: string;
  /**
   * F-PT2 T3 (spec K2) — `is_active`. Mockup'ta karşılığı YOK (formun
   * kendisi yalnız YENİ kayıt yaratır), yalnız DÜZENLEME kipinde
   * gösterilir/değiştirilebilir. Oluşturma kipinde her zaman `true` kalır
   * ve gövdeye sabit `true` gider (build-body.ts deseni korunur).
   */
  isActive: boolean;
}

export function emptyPersonnelFormValues(): PersonnelFormValues {
  return {
    firstName: "",
    lastName: "",
    source: "",
    subcontractorId: "",
    trade: "",
    isActive: true,
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
  };
}
