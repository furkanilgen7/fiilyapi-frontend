import type { PlanCellTag, PlanGoalStatus } from "@/lib/api/hooks/useSitePlan";

/**
 * Planlama ekranının Türkçe etiketleri — TEK KAYNAK (`section-labels.ts`
 * deseni). T3'ün düzenleme kontrolleri de BUNLARI kullanacak, kopyalamayacak.
 */

/** Haftalık hedef durum rozetleri (P209/214/219/224). */
export const PLAN_GOAL_STATUS_LABELS: Record<PlanGoalStatus, string> = {
  completed: "Tamamlandı",
  in_progress: "Devam Ediyor",
  waiting: "Beklemede",
  service_pending: "Servis Bekliyor",
};

/**
 * Hücre renk etiketlerinin okunur adları. Ekranda BASILMAZ (mockup'ta çipin
 * üstünde renk adı yoktur) — ekran okuyucu için `title`/`aria-label` üretir ve
 * T3'ün renk seçicisi bunları gösterecek.
 */
export const PLAN_CELL_TAG_LABELS: Record<PlanCellTag, string> = {
  blue: "Mavi",
  green: "Yeşil",
  yellow: "Sarı",
  purple: "Mor",
  gray: "Gri",
  red: "Kırmızı",
};

/** Ekipman grubunun sabit başlığı (P158) — bu grupta bölüm adı YOKTUR. */
export const EQUIPMENT_GROUP_TITLE = "Makine & Ekipman";

/**
 * Bölümü OLMAYAN ekip grubunun başlığı. Mockup'ta karşılığı yok (çizilen tek
 * ekip grubu bölümlüdür) ama gruplama anahtarı `(kind, section_id)` olduğu
 * için `section_id === null` bir ekip grubu mümkündür; başlıksız bırakmak
 * satırları sahipsiz gösterirdi.
 */
export const UNASSIGNED_CREW_GROUP_TITLE = "Bölümsüz Ekipler";
