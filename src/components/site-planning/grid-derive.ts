import type {
  SitePlanCellRead,
  SitePlanGroup,
  SitePlanRowRead,
} from "@/lib/api/hooks/useSitePlan";

import {
  EQUIPMENT_GROUP_TITLE,
  UNASSIGNED_CREW_GROUP_TITLE,
} from "./plan-labels";

/** Izgaranın SAF türevleri (F-PL T2) — bileşenlerin içinde hesap yoktur. */

/**
 * Grup başlığı (P121 / P157).
 *
 * TUZAK: `section_name`/`section_manager_name` GRUP düzeyindedir, satırda
 * değil. Ekipman grubunda üçü de `null`dur — başlık ekranın SABİTİNDEN gelir,
 * bölüm adı beklenmez.
 */
export function planGroupTitle(group: SitePlanGroup): string {
  if (group.kind === "equipment") return EQUIPMENT_GROUP_TITLE;
  return group.section_name ?? UNASSIGNED_CREW_GROUP_TITLE;
}

/**
 * Grup başlığının ikinci hücresi (P123: "Bölüm sorumlusu: Sercan Öztürk").
 * Sorumlu yoksa hücre BOŞ kalır — mockup'ın ekipman grubunda (P159) da öyledir.
 */
export function planGroupManagerText(group: SitePlanGroup): string {
  const manager = group.section_manager_name;
  if (manager === null || manager.length === 0) return "";
  return `Bölüm sorumlusu: ${manager}`;
}

/**
 * Satır etiketi: ekip satırında "Kalıpçı (14)" (P126), ekipman satırında
 * yalnız ad (P162). TÜREV: `planned_worker_count` null olduğunda boş parantez
 * "( )" basmak yerine parantez HİÇ basılmaz — ekipman satırlarında sayı
 * kavramı yoktur ve ekip satırında da "bilinmiyor" demek doğrudur.
 */
export function planRowLabel(row: SitePlanRowRead): string {
  if (row.planned_worker_count === null) return row.label;
  return `${row.label} (${row.planned_worker_count})`;
}

/**
 * `plan_date` → hücre eşlemesi.
 *
 * TUZAK: `cells` SEYREKTİR (planı olmayan gün hücre üretmez). Sütunlar
 * `days`ten çizilir ve hücre TARİHLE eşleştirilir — `cells` İNDEKSİYLE asla,
 * yoksa boş günlerden sonraki her hücre bir sola kayardı.
 */
export function planCellsByDate(row: SitePlanRowRead): Map<string, SitePlanCellRead> {
  return new Map(row.cells.map((cell) => [cell.plan_date, cell]));
}
