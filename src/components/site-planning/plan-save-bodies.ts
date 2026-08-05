import type {
  SitePlanCellInput,
  SitePlanCellsSave,
  SitePlanGoalsSave,
  SitePlanRowSaved,
  SitePlanRowsSave,
  SitePlanSprintSave,
} from "@/lib/api/hooks/useSitePlanMutations";

import type { PlanDraft, PlanDraftRow } from "./plan-draft";
import { weekDates } from "./week";

/**
 * Taslak → PUT gövdeleri (F-PL T3) — SAF üreticiler.
 *
 * Dört uç da DEĞİŞTİRME (replace) semantiğindedir: gövdede geçmeyen kayıt
 * SİLİNİR. Bu yüzden her üretici, kapsamının TAMAMINI basar:
 *   - `rows`  → ŞANTİYENİN tüm satırları (hafta kavramı YOK)
 *   - `cells` → YALNIZ görünen haftanın hücreleri (başka hafta girerse 422)
 *   - `goals` → o haftanın tüm hedefleri
 */

/**
 * Satırın DOĞAL anahtarı — backend `(site_id, kind, section_id, label)`
 * tekilliğini zorlar, dolayısıyla bu üçlü bir şantiye içinde ENJEKTİFTİR ve
 * yanıttaki satırı gövdedeki satıra birebir bağlar. `sort_order` üzerinden
 * eşleme SEÇİLMEDİ: onu backend yeniden numaralandırmakta serbesttir, oysa bu
 * üçlüyü değiştiremez (değiştirse tekillik kuralını çiğnerdi).
 */
export function planRowNaturalKey(
  kind: string,
  sectionId: string | null,
  label: string,
): string {
  return `${kind}::${sectionId ?? ""}::${label.trim()}`;
}

/**
 * Aynı doğal anahtarı taşıyan İKİ satır varsa etiketini döndürür.
 *
 * İki nedenle kaydetmeden ÖNCE bakılır: (1) backend zaten 422 verirdi,
 * (2) yanıt eşlemesi belirsizleşir ve yeni satır yanlış kimliği alırdı.
 */
export function findDuplicateRowLabel(rows: readonly PlanDraftRow[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = planRowNaturalKey(row.kind, row.sectionId, row.label);
    if (seen.has(key)) return row.label.trim();
    seen.add(key);
  }
  return null;
}

/** Etiketi boş olan ilk satırın grubu (backend `label` zorunlu tutar). */
export function hasBlankRowLabel(rows: readonly PlanDraftRow[]): boolean {
  return rows.some((row) => row.label.trim().length === 0);
}

/** ŞANTİYENİN TÜM satırları. `sort_order` ekrandaki sıradır. */
export function buildRowsBody(draft: PlanDraft): SitePlanRowsSave {
  return {
    rows: draft.rows.map((row, index) => ({
      id: row.serverId,
      kind: row.kind,
      // Backend kuralı: ekipman satırının bölümü OLAMAZ (422).
      section_id: row.kind === "equipment" ? null : row.sectionId,
      label: row.label.trim(),
      planned_worker_count: row.kind === "equipment" ? null : row.plannedWorkerCount,
      sort_order: index,
    })),
  };
}

/**
 * `rows` yanıtından `satır anahtarı → sunucu kimliği` eşlemesi.
 *
 * Yeni satırın gerçek kimliği YALNIZ buradan gelir; hücre gövdesi `row_id`
 * istediği için hücreler ancak bu eşleme kurulduktan sonra gönderilebilir.
 */
export function buildRowIdMap(
  rows: readonly PlanDraftRow[],
  saved: readonly SitePlanRowSaved[],
): Map<string, string> {
  const savedByKey = new Map(
    saved.map((row) => [planRowNaturalKey(row.kind, row.section_id, row.label), row.id]),
  );
  const map = new Map<string, string>();
  for (const row of rows) {
    const sectionId = row.kind === "equipment" ? null : row.sectionId;
    const id = savedByKey.get(planRowNaturalKey(row.kind, sectionId, row.label));
    if (id !== undefined) map.set(row.key, id);
  }
  return map;
}

/** Kaydetme öncesi bilinen kimlikler (yalnız `cells` kirliyken kullanılır). */
export function existingRowIdMap(rows: readonly PlanDraftRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.serverId !== null) map.set(row.key, row.serverId);
  }
  return map;
}

/**
 * YALNIZ görünen haftanın hücreleri.
 *
 * İki eleme var: (1) hafta dışına düşen tarih GÖVDEYE GİRMEZ — backend
 * `format_cell_out_of_week` ile 422 verir; (2) metni boş hücre yazılmaz —
 * hücre yokluğu "plan yok" demektir, boşaltmanın yolu budur.
 */
export function buildCellsBody(
  draft: PlanDraft,
  rowIds: ReadonlyMap<string, string>,
): SitePlanCellsSave {
  const weekDaySet = new Set(weekDates(draft.weekStart));
  const cells: SitePlanCellInput[] = [];
  for (const row of draft.rows) {
    const rowId = rowIds.get(row.key) ?? row.serverId;
    if (rowId === null || rowId === undefined) continue;
    for (const [planDate, cell] of Object.entries(row.cells)) {
      if (!weekDaySet.has(planDate)) continue;
      if (cell.text.trim().length === 0) continue;
      cells.push({ row_id: rowId, plan_date: planDate, text: cell.text.trim(), tag: cell.tag });
    }
  }
  return { cells };
}

/**
 * Haftanın TÜM hedefleri.
 *
 * `filter` yalnız SAVUNMA amaçlı kaldı: başlığı boş hedef artık kaydetmeyi
 * görünür bir mesajla ENGELLER (`usePlanSave::validateDraft`), dolayısıyla
 * normal akışta buraya hiç ulaşmaz. Bırakılma gerekçesi, bu saf üreticinin
 * doğrulama kapısı olmayan bir çağrı yeri edinmesi ihtimalinde şemaya aykırı
 * (boş `title`) gövde ÜRETMEMESİDİR — sessiz atlama artık tek yol değil,
 * ulaşılamaz bir yedektir.
 */
export function buildGoalsBody(draft: PlanDraft): SitePlanGoalsSave {
  return {
    goals: draft.goals
      .filter((goal) => goal.title.trim().length > 0)
      .map((goal, index) => ({
        id: goal.serverId,
        title: goal.title.trim(),
        note: goal.note.trim().length > 0 ? goal.note.trim() : null,
        is_done: goal.isDone,
        status: goal.status,
        sort_order: index,
      })),
  };
}

/** Boş ad aktif sprinti KAPATIR (uç `null` döner — hata değildir). */
export function buildSprintBody(draft: PlanDraft): SitePlanSprintSave {
  const name = draft.sprintName.trim();
  return { name: name.length > 0 ? name : null };
}
