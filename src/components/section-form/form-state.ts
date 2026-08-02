import type { SectionDetailResponse } from "@/lib/api/hooks/useSection";
import type { SectionStatus, SectionType } from "@/lib/section-labels";

/**
 * Bölüm formunun tüm alanları — hepsi KONTROLLÜ ve string tabanlı (sayı ve
 * tarih alanları da), site-form deseniyle aynı. Dönüşüm (boş → `null`,
 * `Number(...)`) `build-body.ts`nin işidir.
 */
export interface SectionFormValues {
  name: string;
  code: string;
  sortOrder: string;
  sectionType: SectionType | "";
  status: SectionStatus;
  description: string;
  managerUserId: string;
  deputyManagerUserId: string;
  plannedWorkerCount: string;
  startDate: string;
  endDate: string;
  budgetAmount: string;
}

export function emptySectionFormValues(): SectionFormValues {
  return {
    name: "",
    code: "",
    sortOrder: "0",
    sectionType: "",
    status: "planned",
    description: "",
    managerUserId: "",
    deputyManagerUserId: "",
    plannedWorkerCount: "",
    startDate: "",
    endDate: "",
    budgetAmount: "",
  };
}

/**
 * Düzenleme kipinde mevcut bölümden form değerlerini doldurur (brief §Teknik
 * kurallar). `manager_name`/`deputy_manager_name` serbest metin karşılıkları
 * yalnız eski (kullanıcı bağlı olmayan) kayıtları temsil etmek için OKUNUR —
 * formda YAZILABİLİR bir karşılığı yoktur (bkz. `SectionForm.tsx` sorumlu
 * seçici kararı); bu yüzden burada state'e taşınmaz, kaybolmaz çünkü
 * `manager_user_id` boşken `manager_name` gövdede DOKUNULMADAN kalır (PATCH'te
 * hiç gönderilmez).
 */
export function sectionFormValuesFromDetail(detail: SectionDetailResponse): SectionFormValues {
  return {
    name: detail.name,
    code: detail.code ?? "",
    sortOrder: String(detail.sort_order),
    sectionType: detail.section_type ?? "",
    status: detail.status,
    description: detail.description ?? "",
    managerUserId: detail.manager_user_id ?? "",
    deputyManagerUserId: detail.deputy_manager_user_id ?? "",
    plannedWorkerCount:
      detail.planned_worker_count === null || detail.planned_worker_count === undefined
        ? ""
        : String(detail.planned_worker_count),
    startDate: detail.start_date ?? "",
    endDate: detail.end_date ?? "",
    budgetAmount: detail.budget_amount ?? "",
  };
}
