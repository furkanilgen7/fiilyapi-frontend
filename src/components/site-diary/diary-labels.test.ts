import { describe, it, expect } from "vitest";

import {
  resolveWorkerSourceLabel,
  UNKNOWN_WORKER_SOURCE_LABEL,
  WORKER_SOURCE_LABELS,
  WORKER_SOURCE_VALUES,
} from "./diary-labels";

// F-TB1 T5 — `worker_source` semasi BES degerlidir (schema.d.ts `WorkerSource`:
// company/subcontractor/general/freelance/intern). `WORKER_SOURCE_LABELS`
// tek etiket kaynagi; bu dosyanin ithal edildigi HER yuzey (personel listesi,
// personel detayi, gunluk isci dagilimi, puantaj) AYNI Turkce sozcukleri
// kullanmali — kopya harita YASAK.
describe("WORKER_SOURCE_VALUES", () => {
  it("semanin BES degerini de tasir", () => {
    expect(WORKER_SOURCE_VALUES).toHaveLength(5);
    expect(new Set(WORKER_SOURCE_VALUES)).toEqual(
      new Set(["company", "subcontractor", "general", "freelance", "intern"]),
    );
  });

  it("WORKER_SOURCE_LABELS'in anahtarlariyla BIREBIR aynidir", () => {
    expect(new Set(WORKER_SOURCE_VALUES)).toEqual(new Set(Object.keys(WORKER_SOURCE_LABELS)));
  });
});

describe("resolveWorkerSourceLabel", () => {
  it("HER enum degeri icin Turkce etiket doner, ham deger asla YOK", () => {
    for (const source of WORKER_SOURCE_VALUES) {
      const label = resolveWorkerSourceLabel(source);
      expect(label).toBe(WORKER_SOURCE_LABELS[source]);
      expect(label).not.toBe(source);
    }
  });

  it("bagliyici yeni etiketler: freelance -> Serbest, intern -> Stajyer", () => {
    expect(resolveWorkerSourceLabel("freelance")).toBe("Serbest");
    expect(resolveWorkerSourceLabel("intern")).toBe("Stajyer");
  });

  it("taninmayan deger uydurma etiket URETMEZ, sabit yer tutucuya duser", () => {
    expect(resolveWorkerSourceLabel("some_future_value")).toBe(UNKNOWN_WORKER_SOURCE_LABEL);
  });
});
