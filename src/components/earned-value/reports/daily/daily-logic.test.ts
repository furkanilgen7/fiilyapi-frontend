import { describe, expect, it } from "vitest";

import { approveGate, reportEyebrow, reportNoLabel, versionSuffix } from "./daily-logic";

describe("approveGate — GİR onay düğmesi (S10, S12)", () => {
  it("APPROVE izni yoksa düğme görünmez", () => {
    expect(approveGate({ level: "view", siteCompleted: false, status: "draft", draftDiaryDates: [] })).toEqual({
      visible: false,
      disabled: false,
      reason: null,
    });
  });

  it("tamamlanmış şantiyede düğme görünmez (izin olsa bile)", () => {
    expect(approveGate({ level: "admin", siteCompleted: true, status: "draft", draftDiaryDates: [] }).visible).toBe(false);
  });

  it("rapor zaten onaylıysa düğme görünmez", () => {
    expect(approveGate({ level: "approve", siteCompleted: false, status: "approved", draftDiaryDates: [] }).visible).toBe(false);
  });

  it("rapor üretilemediyse (not_generated) düğme görünmez", () => {
    expect(approveGate({ level: "admin", siteCompleted: false, status: "not_generated", draftDiaryDates: [] }).visible).toBe(false);
  });

  it("S10: taslak günlük VARKEN düğme görünür ama PASİF, neden verilir", () => {
    const gate = approveGate({ level: "approve", siteCompleted: false, status: "draft", draftDiaryDates: ["2026-09-21"] });
    expect(gate.visible).toBe(true);
    expect(gate.disabled).toBe(true);
    expect(gate.reason).not.toBeNull();
  });

  it("S12: taslak günlük YOKKEN — bugün olmasa da — düğme etkin", () => {
    const gate = approveGate({ level: "approve", siteCompleted: false, status: "draft", draftDiaryDates: [] });
    expect(gate).toEqual({ visible: true, disabled: false, reason: null });
  });

  it("admin de en az approve sayılır (hasAtLeast artan sıra)", () => {
    expect(approveGate({ level: "admin", siteCompleted: false, status: "draft", draftDiaryDates: [] }).visible).toBe(true);
  });
});

describe("reportNoLabel — S13 'GİR-0142'", () => {
  it("4 haneye sıfırla doldurur", () => {
    expect(reportNoLabel(142)).toBe("GİR-0142");
  });
  it("null → boş yer tutucu", () => {
    expect(reportNoLabel(null)).toBe("GİR-—");
  });
  it("4 haneden büyük sayı kesilmez", () => {
    expect(reportNoLabel(12345)).toBe("GİR-12345");
  });
});

describe("versionSuffix — S13 '· sürüm n'", () => {
  it("onaylı + versiyon varsa ek yapılır", () => {
    expect(versionSuffix("approved", 2)).toBe(" · sürüm 2");
  });
  it("taslakta ek YOK", () => {
    expect(versionSuffix("draft", 2)).toBe("");
  });
  it("onaylı ama versiyon null ise ek YOK", () => {
    expect(versionSuffix("approved", null)).toBe("");
  });
});

describe("reportEyebrow — GİR:148 başlık 'firma · proje · şantiye'", () => {
  it("üçü de doluysa ' · ' ile birleşir", () => {
    expect(reportEyebrow("FİİL Yapı", "Güneşkent Konut", "A-Blok Şantiyesi")).toBe(
      "FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi",
    );
  });

  it("boş firma ATLANIR, ayraç kaymaz", () => {
    expect(reportEyebrow("", "Güneşkent Konut", "A-Blok Şantiyesi")).toBe("Güneşkent Konut · A-Blok Şantiyesi");
  });

  it("boş proje ATLANIR (ortadaki boşluk)", () => {
    expect(reportEyebrow("FİİL Yapı", "", "A-Blok Şantiyesi")).toBe("FİİL Yapı · A-Blok Şantiyesi");
  });

  it("boş şantiye ATLANIR (sondaki boşluk)", () => {
    expect(reportEyebrow("FİİL Yapı", "Güneşkent Konut", "")).toBe("FİİL Yapı · Güneşkent Konut");
  });

  it("üçü de boşsa boş dize döner", () => {
    expect(reportEyebrow("", "", "")).toBe("");
  });

  it("yalnız boşluklardan oluşan parça da boş sayılır", () => {
    expect(reportEyebrow("  ", "Güneşkent Konut", "A-Blok Şantiyesi")).toBe("Güneşkent Konut · A-Blok Şantiyesi");
  });
});
