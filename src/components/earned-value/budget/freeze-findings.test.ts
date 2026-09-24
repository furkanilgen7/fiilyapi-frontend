import { describe, it, expect } from "vitest";

import { emptyRateCount, freezeBlockers, stepSubtitles } from "./freeze-findings";
import { indexLeaves } from "./budget-tree";
import { ACTIVE_REV_1, G_IZO, LEAF_IZO, LEAF_TML, budgetView } from "./budget-fixtures";

describe("freezeBlockers (B1-7 · Ek Formlar M6)", () => {
  it("disiplinsiz doğrudan bütçeli grup → Adım 1 bağlantılı engel, grup adlarıyla", () => {
    const view = budgetView();
    expect(freezeBlockers(view, "draft")).toEqual([
      {
        code: "disciplineless_group",
        title: "1 BOQ grubu disiplinsiz (doğrudan bütçeli)",
        detail: "Su yalıtımı",
        step: 1,
      },
    ]);
  });

  it("penceresiz Bölümsüz yaprak → Adım 2, kalem kodu + miktar", () => {
    const view = budgetView({
      freeze_blockers: [{ code: "missing_window", count: 1, node_ids: [LEAF_IZO] }],
    });
    expect(freezeBlockers(view, "draft")).toEqual([
      {
        code: "missing_window",
        title: "1 Bölümsüz yaprağın penceresi çıkmıyor",
        detail: "IZO.01.01 Membran yalıtım · 2.280 m²",
        step: 2,
      },
    ]);
  });

  it("bölümlü yaprak da varsa metin genel kalır; iş günü yoksa ayrı engel", () => {
    const view = budgetView({
      freeze_blockers: [
        { code: "missing_window", count: 2, node_ids: [LEAF_IZO, LEAF_TML] },
        { code: "no_working_day", count: 1, node_ids: [LEAF_TML] },
      ],
    });
    const out = freezeBlockers(view, "draft");
    expect(out.map((b) => b.title)).toEqual([
      "2 yaprağın penceresi çıkmıyor",
      "1 yaprağın penceresinde iş günü yok",
    ]);
    expect(out.every((b) => b.step === 2)).toBe(true);
  });

  it("taslak yokken TEK engel 'Dondurulacak taslak yok' (M6 b)", () => {
    const view = budgetView({ revision: ACTIVE_REV_1 });
    expect(freezeBlockers(view, "active")).toEqual([
      { code: "no_draft", title: "Dondurulacak taslak yok", detail: null, step: null },
    ]);
  });

  it("tanınmayan engel kodu da listelenir (sessiz düşmez)", () => {
    const view = budgetView({ freeze_blockers: [{ code: "yeni_kural", count: 3, node_ids: [] }] });
    expect(freezeBlockers(view, "draft")[0]).toMatchObject({ code: "yeni_kural", title: "3 dondurma engeli (yeni_kural)" });
  });

  it("indeks dışı düğüm kimliği detayı bozmaz", () => {
    const view = budgetView({
      freeze_blockers: [{ code: "disciplineless_group", count: 2, node_ids: [`g:${G_IZO}`, "g:bilinmeyen"] }],
    });
    expect(freezeBlockers(view, "draft")[0].detail).toBe("Su yalıtımı");
    expect(indexLeaves(view).size).toBe(4);
  });
});

describe("emptyRateCount / stepSubtitles (BÜT:646-648 + Ek Formlar (c))", () => {
  it("uyarıdan boş oran sayısı", () => {
    expect(emptyRateCount(budgetView())).toBe(1);
    expect(emptyRateCount(budgetView({ freeze_warnings: [] }))).toBe(0);
  });

  it("taslak: adım alt metinleri engel/uyarı özetinden türer", () => {
    const view = budgetView();
    const subs = stepSubtitles(view, "draft", freezeBlockers(view, "draft"));
    expect(subs).toEqual([
      { text: "1 grup disiplinsiz · 1 oran eksik", danger: true },
      { text: "1 disiplin · dağılım", danger: false },
      { text: "S-eğrisi · işçi", danger: false },
      { text: "1 engel · dondurulamaz", danger: true },
    ]);
  });

  it("temiz taslak: 'Tamam' ve 'Dondurulmadı'; donmuş: 'Donduruldu'", () => {
    const clean = budgetView({ freeze_blockers: [], freeze_warnings: [] });
    const subs = stepSubtitles(clean, "draft", []);
    expect(subs[0]).toEqual({ text: "Tamam", danger: false });
    expect(subs[3]).toEqual({ text: "Dondurulmadı", danger: false });
    const frozen = budgetView({ revision: ACTIVE_REV_1, freeze_blockers: [], freeze_warnings: [] });
    expect(stepSubtitles(frozen, "active", [])[3]).toEqual({ text: "Donduruldu", danger: false });
  });

  it("penceresiz yaprak Adım 2 alt metnine yansır", () => {
    const view = budgetView({
      freeze_blockers: [{ code: "missing_window", count: 1, node_ids: [LEAF_IZO] }],
      freeze_warnings: [],
    });
    expect(stepSubtitles(view, "draft", freezeBlockers(view, "draft"))[1]).toEqual({
      text: "1 yaprak penceresiz",
      danger: true,
    });
  });
});
