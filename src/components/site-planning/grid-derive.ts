import type { PlanResourceKind } from "@/lib/api/hooks/useSitePlan";

import {
  EQUIPMENT_GROUP_TITLE,
  UNASSIGNED_CREW_GROUP_TITLE,
} from "./plan-labels";

/**
 * Izgaranın SAF türevleri (F-PL T2).
 *
 * T3 NOTU: imzalar sunucu tipinden ALANLARA indirildi — ızgara artık sunucu
 * nesnesini değil yerel taslağı (`plan-draft.ts`) çiziyor ve iki ayrı türev
 * ailesi tutmak (biri sunucu, biri taslak) aynı kuralı ikiye bölerdi.
 */

/**
 * Grup başlığı (P121 / P157).
 *
 * TUZAK: bölüm adı GRUP düzeyindedir, satırda değil. Ekipman grubunda `null`dur
 * — başlık ekranın SABİTİNDEN gelir, bölüm adı beklenmez.
 */
export function planGroupTitle(kind: PlanResourceKind, sectionName: string | null): string {
  if (kind === "equipment") return EQUIPMENT_GROUP_TITLE;
  return sectionName ?? UNASSIGNED_CREW_GROUP_TITLE;
}

/**
 * Grup başlığının ikinci hücresi (P123: "Bölüm sorumlusu: Sercan Öztürk").
 * Sorumlu yoksa hücre BOŞ kalır — mockup'ın ekipman grubunda (P159) da öyledir.
 */
export function planGroupManagerText(managerName: string | null): string {
  if (managerName === null || managerName.length === 0) return "";
  return `Bölüm sorumlusu: ${managerName}`;
}

/**
 * Satır etiketi: ekip satırında "Kalıpçı (14)" (P126), ekipman satırında
 * yalnız ad (P162). TÜREV: sayı null olduğunda boş parantez "( )" basmak
 * yerine parantez HİÇ basılmaz — ekipman satırlarında sayı kavramı yoktur.
 */
export function planRowLabel(label: string, plannedWorkerCount: number | null): string {
  if (plannedWorkerCount === null) return label;
  return `${label} (${plannedWorkerCount})`;
}
