import { describe, it, expect } from "vitest";

import { WORKER_SOURCE_LABELS as DIARY_WORKER_SOURCE_LABELS } from "@/components/site-diary/diary-labels";

import {
  dayHoursModifier,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  timesheetCodeMeta,
  TIMESHEET_CODES,
  WORKER_SOURCE_LABELS,
  WORKER_SOURCE_VALUES,
} from "./timesheet-codes";

describe("TIMESHEET_CODES", () => {
  it("🔴 kod seti UCLUDUR — `worked`/`overtime` KALKTI (calisilan gun artik saattir)", () => {
    expect(TIMESHEET_CODES.map((meta) => meta.code)).toEqual([
      "leave",
      "temporary_duty",
      "holiday",
    ]);
  });

  it("rozet metinleri mockup'tan gelir (E5 260 'İzin' · E5 281 'Görev')", () => {
    expect(timesheetCodeMeta("leave")?.letter).toBe("İzin");
    expect(timesheetCodeMeta("temporary_duty")?.letter).toBe("Görev");
  });

  it("`holiday` yeni mockup'ta cizilmedi ama enum uyesi KORUNDU — veride varsa basilir", () => {
    expect(timesheetCodeMeta("holiday")).toBeDefined();
  });
});

describe("dayHoursModifier", () => {
  const NORMAL = "9";

  it("normal gun saati = tam gun (E5 203)", () => {
    expect(dayHoursModifier("9", NORMAL)).toBe("full");
  });

  it("normalin ALTI = eksik gun (E5 204)", () => {
    expect(dayHoursModifier("5", NORMAL)).toBe("short");
  });

  it("normalin USTU = fazla mesai tonu (E5 205)", () => {
    expect(dayHoursModifier("12", NORMAL)).toBe("overtime");
  });

  it("bos hucre = calisilmadi (E5 208)", () => {
    expect(dayHoursModifier(null, NORMAL)).toBe("off");
    expect(dayHoursModifier("  ", NORMAL)).toBe("off");
  });

  it("normal gun saati sozlesmeden gelir — 7,5 saatlik bir sirkette 8 saat FM tonudur", () => {
    expect(dayHoursModifier("8", "7.5")).toBe("overtime");
    expect(dayHoursModifier("7.5", "7.5")).toBe("full");
  });
});

// F-TB1 T5 — kaynak etiketleri TEK kaynaktan gelir, kopyalanmaz.
describe("worker source", () => {
  it("etiketler `diary-labels` ile BIREBIR aynidir", () => {
    expect(WORKER_SOURCE_LABELS).toBe(DIARY_WORKER_SOURCE_LABELS);
  });

  it("bilinmeyen deger ham enum basmaz", () => {
    expect(resolveWorkerSourceLabel("company")).toBe(WORKER_SOURCE_LABELS.company);
    for (const value of WORKER_SOURCE_VALUES) {
      expect(resolveWorkerSourceLabel(value)).toBeTruthy();
    }
  });

  it("rozet rengi /personel listesiyle AYNI eslemedir", () => {
    expect(resolveSourceBadgeVariant("company")).toBe("primary");
    expect(resolveSourceBadgeVariant("subcontractor")).toBe("warning");
  });
});
