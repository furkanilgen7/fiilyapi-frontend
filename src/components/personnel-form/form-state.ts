import type { WorkerSource } from "./constants";

/**
 * Formun DURUM TAŞIYAN alanları — **yalnız dördü**.
 *
 * ⚠️ EN ÖNEMLİ KORUMA: mockup'taki devre-dışı alanların (TC, doğum tarihi,
 * telefon, IBAN, ücret, belge…) burada KARŞILIĞI YOKTUR. Değer tutulmadığı
 * için gövdeye sızması FİZİKSEL OLARAK imkânsızdır — `PersonnelCreate`
 * `additionalProperties: false` taşır, fazladan tek anahtar 422 demektir.
 * Bu dosyaya yeni alan eklemek, o alanın sunucu sözleşmesinde karşılığı
 * OLDUĞU anlamına gelir.
 */
export interface PersonnelFormValues {
  /** Mockup 63 — `full_name`in ilk parçası. */
  firstName: string;
  /** Mockup 64 — `full_name`in ikinci parçası. */
  lastName: string;
  /**
   * Mockup 91 → `source`. Boş dize = "Seçiniz...". Yalnız `WorkerSource`
   * değeri tutulabilir: karşılıksız seçenekler (Serbest Meslek, Stajyer)
   * devre-dışı olduğu için buraya HİÇ ulaşamaz.
   */
  source: WorkerSource | "";
  /** Mockup 95 → `subcontractor_id`. Yalnız `source === "subcontractor"` iken dolu. */
  subcontractorId: string;
  /** Mockup 99 → `trade` (seçilen ETİKET metni). */
  trade: string;
}

export function emptyPersonnelFormValues(): PersonnelFormValues {
  return {
    firstName: "",
    lastName: "",
    source: "",
    subcontractorId: "",
    trade: "",
  };
}
