import { describe, it, expect } from "vitest";

import {
  activeRevisionChip,
  budgetAccess,
  nextDraftNumber,
  revisionBadge,
  revisionMode,
  revDative,
  revisionOption,
  screenState,
} from "./revision-state";
import { ACTIVE_REV_1, ARCHIVED_REV_0, budgetView, revision } from "./budget-fixtures";

const DRAFT = revision();
const ACTIVE_VIEW = budgetView({ revision: ACTIVE_REV_1, editable: false });
const ARCHIVED_VIEW = budgetView({ revision: ARCHIVED_REV_0, editable: false });
const NONE_VIEW = budgetView({ revision: null });

describe("revisionMode (B1-5 durum makinesi)", () => {
  it.each([
    [budgetView(), "draft"],
    [ACTIVE_VIEW, "active"],
    [ARCHIVED_VIEW, "archived"],
    [NONE_VIEW, "none"],
  ] as const)("%# → %s", (view, mode) => {
    expect(revisionMode(view)).toBe(mode);
  });
});

describe("budgetAccess (B1-8: view okur · draft düzenler · approve dondurur/siler)", () => {
  it.each([
    ["view", false, false],
    ["draft", true, false],
    ["approve", true, true],
    ["full", true, true],
  ] as const)("%s → draft=%s approve=%s", (level, canDraft, canApprove) => {
    expect(budgetAccess(level)).toEqual({ canDraft, canApprove });
  });

  it("seviye bilinmiyorsa (oturum yükleniyor) bilinmezlik kuralı: açık", () => {
    expect(budgetAccess(undefined)).toEqual({ canDraft: true, canApprove: true });
  });
});

describe("screenState", () => {
  const revisions = [DRAFT, ACTIVE_REV_1, ARCHIVED_REV_0];

  it("taslak + draft: düzenler ama dondur/sil YOK", () => {
    const s = screenState(budgetView(), { canDraft: true, canApprove: false }, revisions);
    expect(s).toMatchObject({ mode: "draft", editable: true, canFreeze: false, canDeleteDraft: false, isViewer: false });
  });

  it("taslak + approve: dondur ve sil açık", () => {
    const s = screenState(budgetView(), { canDraft: true, canApprove: true }, revisions);
    expect(s).toMatchObject({ editable: true, canFreeze: true, canDeleteDraft: true });
  });

  it("taslak + view: görüntüleyici, salt okunur", () => {
    const s = screenState(budgetView(), { canDraft: false, canApprove: false }, revisions);
    expect(s).toMatchObject({ editable: false, isViewer: true, canFreeze: false });
  });

  it("aktif, taslak yok, draft yetkisi → 'Taslak aç (Rev 2)'", () => {
    const s = screenState(ACTIVE_VIEW, { canDraft: true, canApprove: false }, [ACTIVE_REV_1, ARCHIVED_REV_0]);
    expect(s).toMatchObject({ mode: "active", editable: false, canOpenDraft: true, nextDraftNumber: 2, draft: null });
  });

  it("aktif görüntülenirken taslak VARSA taslak açılamaz, taslağa dönülür", () => {
    const s = screenState(ACTIVE_VIEW, { canDraft: true, canApprove: true }, revisions);
    expect(s.canOpenDraft).toBe(false);
    expect(s.draft?.id).toBe("rev-2");
  });

  it("revizyon yok: ilk yazma Rev 0'ı doğurur — draft yetkisiyle düzenlenebilir", () => {
    expect(screenState(NONE_VIEW, { canDraft: true, canApprove: false }, [])).toMatchObject({
      mode: "none",
      editable: true,
      canOpenDraft: false,
    });
    expect(screenState(NONE_VIEW, { canDraft: false, canApprove: false }, []).editable).toBe(false);
  });

  it("backend `editable:false` her zaman kazanır", () => {
    const s = screenState(budgetView({ editable: false }), { canDraft: true, canApprove: true }, revisions);
    expect(s.editable).toBe(false);
  });
});

describe("rozet ve etiketler (BÜT:91, 650-656 · Ek Formlar M5)", () => {
  it.each([
    [budgetView(), "Taslak — Rev 2", "warning"],
    [ACTIVE_VIEW, "Aktif — Rev 1", "success"],
    [ARCHIVED_VIEW, "Görüntülenen: Rev 0", "neutral"],
    [NONE_VIEW, "Revizyon yok", "neutral"],
  ] as const)("%# → %s", (view, label, tone) => {
    expect(revisionBadge(view)).toEqual({ label, tone });
  });

  it("aktif çipi: 'Aktif: Rev 1 · 02.07.2026' / yoksa 'Aktif: —'", () => {
    expect(activeRevisionChip([DRAFT, ACTIVE_REV_1])).toBe("Aktif: Rev 1 · 02.07.2026");
    expect(activeRevisionChip([DRAFT])).toBe("Aktif: —");
  });

  it("açılır liste satırları", () => {
    expect(revisionOption(DRAFT)).toEqual({ label: "Rev 2 · Taslak", sub: "Son düzenleme 23.09.2026" });
    expect(revisionOption(ACTIVE_REV_1)).toEqual({ label: "Rev 1 · Aktif", sub: "Donduruldu 02.07.2026" });
    expect(revisionOption(ARCHIVED_REV_0)).toEqual({ label: "Rev 0 · Arşiv", sub: "Donduruldu 28.04.2026" });
  });

  it("F0-5: yeni taslak numarası = en büyük DONMUŞ numara + 1 (silinen taslağınki yeniden kullanılır)", () => {
    expect(nextDraftNumber([ACTIVE_REV_1, ARCHIVED_REV_0])).toBe(2);
    expect(nextDraftNumber([DRAFT, ACTIVE_REV_1])).toBe(2);
    expect(nextDraftNumber([])).toBe(0);
  });
});

describe("revDative — Türkçe yönelme eki ('Rev 2'ye dön', 'Rev 1'e göre')", () => {
  it.each([
    [0, "Rev 0'a"],
    [1, "Rev 1'e"],
    [2, "Rev 2'ye"],
    [3, "Rev 3'e"],
    [6, "Rev 6'ya"],
    [7, "Rev 7'ye"],
    [9, "Rev 9'a"],
    [10, "Rev 10'a"],
    [12, "Rev 12'ye"],
    [20, "Rev 20'ye"],
    [40, "Rev 40'a"],
    [70, "Rev 70'e"],
    [100, "Rev 100'e"],
  ])("%s → %s", (n, text) => {
    expect(revDative(n)).toBe(text);
  });
});
