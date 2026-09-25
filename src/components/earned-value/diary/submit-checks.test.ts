import { describe, expect, it } from "vitest";

import { buildSubmitState, classifyReason, resolveAllocationAccess, type SubmitInput } from "./submit-checks";

function input(overrides: Partial<SubmitInput> = {}): SubmitInput {
  return {
    submit: { can_submit: true, reasons: [] },
    unallocated: 0,
    reason: "",
    isDirty: false,
    isLocked: false,
    isForeman: false,
    ...overrides,
  };
}

describe("buildSubmitState — Gönder kontrol çubuğu (İ:493-510) + submitGate", () => {
  it("backend izin verir, taslak temiz → kapı açık, üç çip yeşil, 'Gönderime hazır'", () => {
    const state = buildSubmitState(input());
    expect(state.gate).toEqual({ canSubmit: true, reasons: [], showReasonsInCore: false });
    expect(state.checks.map((c) => [c.label, c.tone])).toEqual([
      ["Miktarlar girildi", "ok"],
      ["Bütün saatler dağıtıldı", "ok"],
      ["Hava girildi", "ok"],
    ]);
    expect(state.note).toEqual({ text: "Gönderime hazır", tone: "ok" });
  });

  it("backend 'can_submit: false' ise kapı KAPALI ve gerekçeler backend'in (tek kaynak)", () => {
    const reasons = ["Miktar girilmedi", "Hava bilgisi eksik (durum, min/max sıcaklık, rüzgâr)"];
    const state = buildSubmitState(input({ submit: { can_submit: false, reasons } }));
    expect(state.gate).toEqual({ canSubmit: false, reasons, showReasonsInCore: false });
    expect(state.checks.map((c) => [c.label, c.tone])).toEqual([
      ["Miktar girilmedi", "warn"],
      ["Bütün saatler dağıtıldı", "ok"],
      ["Hava eksik", "warn"],
    ]);
  });

  it("dağıtılmamış saat: gerekçe yoksa 'gerekçe yaz' bağlantısı, varsa 'gerekçe yazıldı'", () => {
    const blocked = buildSubmitState(
      input({ unallocated: 1600, submit: { can_submit: false, reasons: ["16 a-s dağıtılmamış; gerekçe gerekli"] } }),
    );
    expect(blocked.checks[1]).toEqual({
      key: "hours",
      tone: "warn",
      label: "16 a-s dağıtılmamış · gönderim engelli",
      canWriteReason: true,
    });
    expect(blocked.note).toEqual({ text: "Dağıtılmamış saat gönderimi engelliyor", tone: "warn" });
    const reasoned = buildSubmitState(input({ unallocated: -250, reason: "temizlik" }));
    expect(reasoned.checks[1].label).toBe("2,5 a-s fazla dağıtılmış · gerekçe yazıldı");
    expect(reasoned.checks[1].canWriteReason).toBe(false);
    expect(reasoned.note).toEqual({ text: "Gerekçeyle gönderilebilir", tone: "ok" });
  });

  it("kirli taslak kapıyı KAPATMAZ (Kaydet & Gönder önce dağıtımı yazar, S1); saat gerekçesi önizlemeden", () => {
    const backendHours = { can_submit: false, reasons: ["16 a-s dağıtılmamış; gerekçe gerekli"] };
    // Taslakta gerekçe yazıldı → backend'in (kaydedilmiş hâle ait) saat gerekçesi düşer.
    expect(buildSubmitState(input({ isDirty: true, unallocated: 1600, reason: "temizlik", submit: backendHours })).gate).toEqual({
      canSubmit: true,
      reasons: [],
      showReasonsInCore: false,
    });
    // Taslakta dağıtılmamış var ve gerekçe yok → önizleme gerekçesiyle kapalı.
    expect(buildSubmitState(input({ isDirty: true, unallocated: 250 })).gate).toEqual({
      canSubmit: false,
      reasons: ["2,5 a-s dağıtılmamış; gerekçe gerekli"],
      showReasonsInCore: false,
    });
    // Saat dışı backend gerekçesi kirlilikte de korunur.
    const weather = { can_submit: false, reasons: ["Hava bilgisi eksik (durum, min/max sıcaklık, rüzgâr)"] };
    expect(buildSubmitState(input({ isDirty: true, submit: weather })).gate?.canSubmit).toBe(false);
  });

  it("kilitli gün ve formen notları (İ:728)", () => {
    expect(buildSubmitState(input({ isLocked: true })).note.text).toBe("Gün kilitli");
    expect(buildSubmitState(input({ isLocked: true })).gate?.canSubmit).toBe(false);
    const foreman = buildSubmitState(
      input({ isForeman: true, submit: { can_submit: false, reasons: ["Günlüğü göndermek planlama yazma yetkisi ister (formen gönderemez)"] } }),
    );
    expect(foreman.note.text).toBe("Gönderim mühendiste");
    expect(foreman.checks.at(-1)).toMatchObject({ tone: "warn", label: "Günlüğü göndermek planlama yazma yetkisi ister (formen gönderemez)" });
  });

  it("kayıt yokken (submit null) kapı verilmez — çekirdek bugünkü gibi", () => {
    expect(buildSubmitState(input({ submit: null })).gate).toBeNull();
  });
});

describe("classifyReason — backend metni → çip türü (TEK yer; reasons[].code gelince değişir)", () => {
  it.each([
    ["Miktar girilmedi", "quantity"],
    ["Planlı miktarı aşan satır gerekçesiz", "overrun"],
    ["Hava bilgisi eksik (durum, min/max sıcaklık, rüzgâr)", "weather"],
    ["16 a-s dağıtılmamış; gerekçe gerekli", "hours"],
    ["Günlüğü göndermek planlama yazma yetkisi ister (formen gönderemez)", "other"],
  ])("%s → %s", (reason, kind) => {
    expect(classifyReason(reason)).toBe(kind);
  });
});

describe("resolveAllocationAccess — rol (K17) + kilit + tamamlanmış şantiye", () => {
  it("draft+ düzenler; view (formen) salt okur ve formen bandı görür", () => {
    expect(resolveAllocationAccess({ evLevel: "draft", diaryCanWrite: true, isLocked: false, isSiteCompleted: false })).toEqual({
      canEdit: true,
      readOnlyText: null,
      isForeman: false,
      showForemanBand: false,
      canUnlock: false,
    });
    expect(resolveAllocationAccess({ evLevel: "view", diaryCanWrite: true, isLocked: false, isSiteCompleted: false })).toMatchObject({
      canEdit: false,
      readOnlyText: "Saat Dağıtımı mühendis tarafından yapılır",
      isForeman: true,
      showForemanBand: true,
    });
  });

  it("kilitli gün: yetkili bile düzenleyemez; approve kilidi açabilir", () => {
    expect(resolveAllocationAccess({ evLevel: "approve", diaryCanWrite: true, isLocked: true, isSiteCompleted: false })).toMatchObject({
      canEdit: false,
      readOnlyText: "gün kilitli",
      canUnlock: true,
    });
  });

  it("tamamlanmış şantiye: salt okunur, kilit açılamaz", () => {
    expect(resolveAllocationAccess({ evLevel: "admin", diaryCanWrite: true, isLocked: false, isSiteCompleted: true })).toMatchObject({
      canEdit: false,
      readOnlyText: "şantiye tamamlandı",
      canUnlock: false,
    });
  });
});
