import type { DiaryExtensionContext, DiaryLineRef } from "./diary-extension";
import type { DiaryLeafRow } from "./diary-lines-tree";

/**
 * PLN-F2.2 · Çekirdeğin uzantıya bildirdiği bağlamın SAF kurulumu (§2.7 —
 * planlama import YOK; tipler yalnız `diary-extension.ts`ten).
 */
export interface DiaryExtensionContextInput {
  /** Kanonik şantiye UUID'si; henüz çözülmediyse boş/`null`. */
  siteId: string | null;
  day: string | null;
  entry: { id: string; status: "draft" | "submitted" } | undefined;
  /** Ağacın öksüz olmayan yaprakları (kaldırılanlar zaten yok). */
  leaves: readonly DiaryLeafRow[];
}

export function buildDiaryExtensionContext({
  siteId,
  day,
  entry,
  leaves,
}: DiaryExtensionContextInput): DiaryExtensionContext {
  const lines: DiaryLineRef[] = leaves.flatMap((leaf) =>
    leaf.boqItemId === null
      ? []
      : [
          {
            key: leaf.key,
            boqItemId: leaf.boqItemId,
            sectionId: leaf.sectionId,
            // Boş hücre `null` (girilmedi); geçersiz metin de `null` — uzantı uydurma sayı görmez.
            quantityToday: leaf.todayText.trim() === "" ? null : leaf.todayValue,
          },
        ],
  );
  return {
    siteId: siteId === null || siteId === "" ? null : siteId,
    day,
    entryId: entry?.id ?? null,
    entryStatus: entry?.status ?? null,
    lines,
  };
}

function sameLine(a: DiaryLineRef, b: DiaryLineRef): boolean {
  return (
    a.key === b.key &&
    a.boqItemId === b.boqItemId &&
    a.sectionId === b.sectionId &&
    a.quantityToday === b.quantityToday
  );
}

/**
 * Sığ eşitlik — bağlam aynıysa uzantı YENİDEN çağrılmaz (her tuş vuruşunda
 * değil, yalnız değer değişince bildirilir).
 */
export function isSameDiaryExtensionContext(
  a: DiaryExtensionContext | null,
  b: DiaryExtensionContext,
): boolean {
  if (a === null) return false;
  return (
    a.siteId === b.siteId &&
    a.day === b.day &&
    a.entryId === b.entryId &&
    a.entryStatus === b.entryStatus &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, index) => sameLine(line, b.lines[index]))
  );
}
