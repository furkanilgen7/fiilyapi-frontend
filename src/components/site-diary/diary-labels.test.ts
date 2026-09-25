import { describe, it, expect } from "vitest";

import {
  WEATHER_LABELS,
  WEATHER_OPTIONS,
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

// PLN-F1.1b — B2 sözleşmesi `Weather` enum'unu 5 → 10 genişletti (yalnız
// ekleme). Backend'den gelen yeni değer ham anahtar olarak BASILMAZ; etiketler
// `Şantiye - Günlük Kayıt (İlerleme).dc.html:611-618`den. Seçici bugün E7'nin
// BEŞ seçeneğini gösterir — 10 ikonlu hava girişi F2'nin (günlük genişlemesi) işi.
describe("WEATHER_LABELS (B2 · 10 değer)", () => {
  it("yeni bes degerin Turkce etiketi vardir", () => {
    expect(WEATHER_LABELS.heavy_rain).toBe("Sağanak");
    expect(WEATHER_LABELS.drizzle).toBe("Hafif yağmur");
    expect(WEATHER_LABELS.windy).toBe("Rüzgârlı");
    expect(WEATHER_LABELS.dusty).toBe("Tozlu");
    expect(WEATHER_LABELS.foggy).toBe("Sisli");
  });

  it("secici F2'ye kadar E7'nin bes secenegiyle kalir", () => {
    expect(WEATHER_OPTIONS.map((o) => o.value)).toEqual([
      "sunny",
      "partly_cloudy",
      "cloudy",
      "rainy",
      "snowy",
    ]);
  });
});

