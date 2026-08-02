import { describe, it, expect } from "vitest";

import { buildSectionBody, numberOrNull, textOrNull } from "./build-body";
import { emptySectionFormValues, type SectionFormValues } from "./form-state";

/**
 * Kanıt yükümlülüğü (brief §Mockup'ta olup backend'i OLMAYAN kartlar):
 * gövde inşasının anahtar kümesi, devre dışı kartlardan (Görevli Taşeronlar,
 * Kullanılacak Makineler, Bağımlılık, Milestone, Gantt checkbox, Bölüm
 * Belgeleri, Bölüme Atanacak İş Kalemleri) HİÇBİR alan İÇERMEZ — çünkü
 * `SectionFormValues`in kendisinde bu kartların karşılığı YOKTUR ve
 * `buildSectionBody` yalnız bu tipten okur.
 */
const ALLOWED_KEYS = [
  "name",
  "code",
  "sort_order",
  "section_type",
  "status",
  "description",
  "manager_user_id",
  "deputy_manager_user_id",
  "planned_worker_count",
  "start_date",
  "end_date",
  "budget_amount",
  "is_draft",
] as const;

const FORBIDDEN_KEYS = [
  "site_id",
  "duration_days",
  "manager_name",
  "deputy_manager_name",
  "subcontractor_ids",
  "equipment_ids",
  "dependency_section_id",
  "milestones",
  "gantt_auto_add",
  "documents",
  "boq_items",
];

function values(overrides: Partial<SectionFormValues> = {}): SectionFormValues {
  return { ...emptySectionFormValues(), name: "Temel & Bodrum Katlar", ...overrides };
}

describe("buildSectionBody", () => {
  it("gövde anahtarları izinli kümenin ALT KÜMESİDİR — devre dışı kart alanı sızmaz", () => {
    const body = buildSectionBody(values(), { isDraft: false });
    for (const key of Object.keys(body)) {
      expect(ALLOWED_KEYS).toContain(key);
    }
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });

  it("kod boşsa anahtar hiç gönderilmez (F68 — sunucu BLM-NN üretir)", () => {
    const body = buildSectionBody(values({ code: "" }), { isDraft: false });
    expect(body).not.toHaveProperty("code");
  });

  it("kod doluysa gönderilir", () => {
    const body = buildSectionBody(values({ code: "BLM-06" }), { isDraft: false });
    expect(body.code).toBe("BLM-06");
  });

  it("budget_amount '0' ise 0 olarak gönderilir — falsy düşürülmez (F110)", () => {
    const body = buildSectionBody(values({ budgetAmount: "0" }), { isDraft: false });
    expect(body.budget_amount).toBe(0);
  });

  it("is_draft HER ZAMAN gönderilir", () => {
    expect(buildSectionBody(values(), { isDraft: true }).is_draft).toBe(true);
    expect(buildSectionBody(values(), { isDraft: false }).is_draft).toBe(false);
  });

  it("boş tarih/sayı alanları null olarak gönderilir (anahtar düşmez, backend nullable)", () => {
    const body = buildSectionBody(values(), { isDraft: true });
    expect(body.start_date).toBeNull();
    expect(body.end_date).toBeNull();
    expect(body.planned_worker_count).toBeNull();
    expect(body.section_type).toBeNull();
    expect(body.description).toBeNull();
    expect(body.manager_user_id).toBeNull();
    expect(body.deputy_manager_user_id).toBeNull();
  });
});

describe("textOrNull / numberOrNull", () => {
  it("boş/boşluk metin null döner", () => {
    expect(textOrNull("")).toBeNull();
    expect(textOrNull("   ")).toBeNull();
    expect(textOrNull(" a ")).toBe("a");
  });

  it("'0' geçerli sayıdır, null DEĞİLDİR", () => {
    expect(numberOrNull("0")).toBe(0);
  });

  it("boş/sayı olmayan girişte null döner", () => {
    expect(numberOrNull("")).toBeNull();
    expect(numberOrNull("abc")).toBeNull();
  });
});
