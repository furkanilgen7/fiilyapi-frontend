import type { PersonnelListItem } from "./usePersonnel";

/**
 * F-İK T2 — `PersonnelResponse`un İK-1 ile gelen 18 alanı için test
 * varsayılanları (`site-fixtures.ts` deseni).
 *
 * Sözleşme bu alanların HEPSİNİ zorunlu döndürür; her test dosyasında 18 satırı
 * tekrar yazmak yerine tek yerden yayılır
 * (`{ ...EMPTY_PERSONNEL_HR_FIELDS, ...fixture }`). Yalnız testlerde
 * kullanılır — uygulama kodu bu modülü import etmez.
 */
export const EMPTY_PERSONNEL_HR_FIELDS: Omit<
  PersonnelListItem,
  "id" | "full_name" | "trade" | "source" | "subcontractor_id" | "user_id" | "is_active"
> = {
  tc_no: null,
  birth_date: null,
  gender: null,
  marital_status: null,
  phone: null,
  email: null,
  address: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  hire_date: null,
  wage_type: null,
  wage_amount: null,
  payment_method: null,
  iban: null,
  sgk_no: null,
  assigned_project_id: null,
  assigned_section_id: null,
  is_draft: false,
};
