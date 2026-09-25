import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";

import {
  buildDiaryCreateBody,
  buildDiaryLinesBody,
  buildDiaryUpdateBody,
  diaryFormFromEntry,
  emptyDiaryForm,
  invalidQuantityIds,
  invalidWorkerCountIds,
  isDiaryFormDirty,
  parseDiaryQuantity,
  type DiaryFormState,
} from "./form-state";

// F-SD T6 · "Kayıt Gir" formunun saf durumu (T2). Kapsam sınırı (pending
// sızıntısı yok) ve DEĞİŞTİRME semantiği burada kanıtlanır.

function line(overrides: Record<string, unknown> = {}) {
  return {
    id: "l-1",
    boq_item_id: "bi-1",
    code: "03.001",
    description: "C25/30 Beton",
    unit: "m³",
    unit_price: "1520.00",
    quantity: "120.000",
    cumulative_quantity: "900.000",
    line_amount: "182400.00",
    ...overrides,
  };
}

function entry(overrides: Record<string, unknown> = {}): SiteDiaryEntryDetail {
  return {
    id: "d-1",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: "2026-07-15",
    section_id: "sec-1",
    weather: "sunny",
    temperature_c: "28.0",
    work_done: "6. kat döşeme betonu döküldü.",
    chief_note: "Beton pompası sahada.",
    safety_meeting_held: true,
    ppe_checked: true,
    has_incident: false,
    incident_note: null,
    status: "draft",
    submitted_at: null,
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    updated_at: "2026-07-15T09:00:00Z",
    lines: [line()],
    worker_counts: [{ id: "w-1", trade: "Kalıpçılar", source: "company", count: 12 }],
    lines_total: "182400.00",
    worker_total: 12,
    dropped_orphan_count: 0,
    ...overrides,
  } as unknown as SiteDiaryEntryDetail;
}

describe("emptyDiaryForm", () => {
  it("tarih dışındaki her alanı boş/kapalı başlatır", () => {
    expect(emptyDiaryForm("2026-08-03")).toEqual({
      entryDate: "2026-08-03",
      sectionId: "",
      weather: "",
      tempMinC: "",
      tempMaxC: "",
      windMs: "",
      workDone: "",
      chiefNote: "",
      safetyMeetingHeld: false,
      ppeChecked: false,
      hasIncident: false,
      incidentNote: "",
      quantities: {},
      workerCounts: {},
    });
  });
});

describe("diaryFormFromEntry", () => {
  it("kayıttaki alanları forma taşır", () => {
    const form = diaryFormFromEntry(entry());

    expect(form).toMatchObject({
      entryDate: "2026-07-15",
      sectionId: "sec-1",
      weather: "sunny",
      tempMaxC: "28.0",
      workDone: "6. kat döşeme betonu döküldü.",
      chiefNote: "Beton pompası sahada.",
      safetyMeetingHeld: true,
      ppeChecked: true,
    });
    expect(form.quantities).toEqual({ "bi-1": "120.000" });
    expect(form.workerCounts).toEqual({ "company|Kalıpçılar": "12" });
  });

  it("null alanları boş dizeye düşürür (kontrollü girdiler `null` almaz)", () => {
    const form = diaryFormFromEntry(
      entry({ section_id: null, weather: null, temperature_c: null, work_done: null, chief_note: null }),
    );

    expect(form.sectionId).toBe("");
    expect(form.weather).toBe("");
    expect(form.tempMinC).toBe("");
    expect(form.tempMaxC).toBe("");
    expect(form.windMs).toBe("");
    expect(form.workDone).toBe("");
    expect(form.chiefNote).toBe("");
  });

  it("PLN-F2.1: yeni hava alanları (min/max/rüzgâr) forma taşınır; max eski `temperature_c`yi ezer", () => {
    const form = diaryFormFromEntry(
      entry({ temperature_c: "30.0", temp_min_c: "12.5", temp_max_c: "30.0", wind_ms: "4.5" }),
    );

    expect(form).toMatchObject({ tempMinC: "12.5", tempMaxC: "30.0", windMs: "4.5" });
  });

  it("PLN-F2.1: miktar hücresi YALNIZ Bölümsüz satırdan dolar — bölümlü satır onu ezmez", () => {
    const form = diaryFormFromEntry(
      entry({
        lines: [
          line({ quantity: "5.000", section_id: null }),
          line({ id: "l-2", quantity: "12.000", section_id: "sec-9" }),
        ],
      }),
    );

    expect(form.quantities).toEqual({ "bi-1": "5.000" });
  });

  it("miktarı 0 olan satırı BOŞ hücre olarak gösterir", () => {
    const form = diaryFormFromEntry(entry({ lines: [line({ quantity: "0.000" })] }));

    expect(form.quantities["bi-1"]).toBe("");
  });

  it("öksüz satır (boq_item_id null) forma GİRMEZ", () => {
    const form = diaryFormFromEntry(
      entry({ lines: [line(), line({ id: "l-2", boq_item_id: null })] }),
    );

    expect(Object.keys(form.quantities)).toEqual(["bi-1"]);
  });
});

describe("parseDiaryQuantity", () => {
  it("boş hücre 0'dır", () => {
    expect(parseDiaryQuantity("")).toBe(0);
  });

  it("Türkçe klavyenin virgülünü nokta gibi çevirir", () => {
    expect(parseDiaryQuantity("2,4")).toBe(2.4);
    expect(parseDiaryQuantity("2.4")).toBe(2.4);
  });

  it("negatif ve çevrilemeyen metin null döner (sessizce 0 YAZILMAZ)", () => {
    expect(parseDiaryQuantity("-1")).toBeNull();
    expect(parseDiaryQuantity("abc")).toBeNull();
  });
});

describe("buildDiaryCreateBody", () => {
  it("YALNIZ şemadaki alanları taşır — satır/işçi/durum gövdeye GİRMEZ", () => {
    const form: DiaryFormState = {
      ...emptyDiaryForm("2026-08-03"),
      sectionId: "sec-1",
      weather: "rainy",
      tempMinC: "8",
      tempMaxC: "19,5",
      windMs: "4,5",
      workDone: "  Kalıp söküldü  ",
      chiefNote: "   ",
      safetyMeetingHeld: true,
      quantities: { "bi-1": "12" },
      workerCounts: { "company|Kalıpçılar": "8" },
    };

    const body = buildDiaryCreateBody(form);

    expect(body).toEqual({
      entry_date: "2026-08-03",
      section_id: "sec-1",
      weather: "rainy",
      temp_min_c: 8,
      temp_max_c: 19.5,
      wind_ms: 4.5,
      work_done: "Kalıp söküldü",
      chief_note: null,
      safety_meeting_held: true,
      ppe_checked: false,
      has_incident: false,
      incident_note: null,
    });
    expect(body).not.toHaveProperty("lines");
    expect(body).not.toHaveProperty("worker_counts");
    expect(body).not.toHaveProperty("status");
    // Kullanımdan kalkan alan GÖNDERİLMEZ: backend onu min=max'a yayardı.
    expect(body).not.toHaveProperty("temperature_c");
  });

  it("bölüm/hava seçilmediyse null gider (alanlar nullable)", () => {
    const body = buildDiaryCreateBody(emptyDiaryForm("2026-08-03"));

    expect(body.section_id).toBeNull();
    expect(body.weather).toBeNull();
    expect(body.temp_min_c).toBeNull();
    expect(body.temp_max_c).toBeNull();
    expect(body.wind_ms).toBeNull();
  });
});

describe("buildDiaryUpdateBody", () => {
  it("işçi kırılımını DEĞİŞTİRME semantiğiyle gönderir (sıfır satır dışarıda)", () => {
    const form: DiaryFormState = {
      ...diaryFormFromEntry(entry()),
      workerCounts: { "company|Kalıpçılar": "14", "general|Yardımcı": "0" },
    };

    const body = buildDiaryUpdateBody(form, entry());

    expect(body.worker_counts).toEqual([
      { trade: "Kalıpçılar", source: "company", count: 14, subcontractor_id: null, hours: null },
    ]);
    expect(body).not.toHaveProperty("temperature_c");
  });

  it("PLN-F2.1: kayıttaki FİRMA satırı (kişi × saat) ekranda olmasa da gövdede KORUNUR", () => {
    const detail = entry({
      worker_counts: [
        { id: "w-1", trade: "Kalıpçılar", source: "company", count: 12, subcontractor_id: null, hours: null },
        { id: "w-2", trade: "Demirciler", source: "subcontractor", count: 6, subcontractor_id: "firm-1", hours: "9.0" },
      ],
    });
    const form: DiaryFormState = {
      ...diaryFormFromEntry(detail),
      workerCounts: { ...diaryFormFromEntry(detail).workerCounts, "company|Kalıpçılar": "13" },
    };

    expect(buildDiaryUpdateBody(form, detail).worker_counts).toEqual([
      { trade: "Kalıpçılar", source: "company", count: 13, subcontractor_id: null, hours: null },
      { trade: "Demirciler", source: "subcontractor", count: 6, subcontractor_id: "firm-1", hours: "9.0" },
    ]);
  });

  it("PLN-F2.1: hava gövdesi yeni alanlarla gider (min/max/rüzgâr), `temperature_c` gitmez", () => {
    const form: DiaryFormState = {
      ...diaryFormFromEntry(entry()),
      tempMinC: "11",
      tempMaxC: "24,5",
      windMs: "3",
    };

    const body = buildDiaryUpdateBody(form, entry());

    expect(body).toMatchObject({ temp_min_c: 11, temp_max_c: 24.5, wind_ms: 3 });
    expect(body).not.toHaveProperty("temperature_c");
  });

  it("geçersiz işçi hücresi varsa alan HİÇ gönderilmez (mevcut kırılım korunur)", () => {
    const form: DiaryFormState = {
      ...diaryFormFromEntry(entry()),
      workerCounts: { "company|Kalıpçılar": "-2" },
    };

    const body = buildDiaryUpdateBody(form, entry());

    expect(body.worker_counts).toBeUndefined();
  });
});

describe("buildDiaryLinesBody", () => {
  it("kaydın TÜM satırlarını gönderir — boşaltılan hücre 0 olur (sessizce eski değerde kalmaz)", () => {
    const detail = entry({
      lines: [line(), line({ id: "l-2", boq_item_id: "bi-2", quantity: "40.000" })],
    });
    const form: DiaryFormState = {
      ...diaryFormFromEntry(detail),
      quantities: { "bi-1": "12", "bi-2": "" },
    };

    expect(buildDiaryLinesBody(detail, form)).toEqual({
      lines: [
        { boq_item_id: "bi-1", section_id: null, quantity: 12, overrun_reason: null },
        { boq_item_id: "bi-2", section_id: null, quantity: 0, overrun_reason: null },
      ],
    });
  });

  it("öksüz satırı (boq_item_id null) gövdeye koymaz — şema zorunlu tutuyor", () => {
    const detail = entry({ lines: [line(), line({ id: "l-2", boq_item_id: null })] });

    expect(buildDiaryLinesBody(detail, diaryFormFromEntry(detail)).lines).toHaveLength(1);
  });

  it("geçersiz hücrede satırın SUNUCUDAKİ miktarı korunur (uydurma 0 yazılmaz)", () => {
    const detail = entry();
    const form: DiaryFormState = { ...diaryFormFromEntry(detail), quantities: { "bi-1": "abc" } };

    expect(buildDiaryLinesBody(detail, form).lines).toEqual([
      { boq_item_id: "bi-1", section_id: null, quantity: 120, overrun_reason: null },
    ]);
  });

  it("PLN-F2.1: bölümlü satırlar (miktar + aşım gerekçesi) DOKUNULMADAN gövdede kalır; hücre yalnız Bölümsüz'ü yazar", () => {
    const detail = entry({
      lines: [
        line({ section_id: null, quantity: "0.000" }),
        line({ id: "l-2", section_id: "sec-9", quantity: "12.000", overrun_reason: "Ek iş emri" }),
      ],
    });
    const form: DiaryFormState = { ...diaryFormFromEntry(detail), quantities: { "bi-1": "4" } };

    expect(buildDiaryLinesBody(detail, form).lines).toEqual([
      { boq_item_id: "bi-1", section_id: null, quantity: 4, overrun_reason: null },
      { boq_item_id: "bi-1", section_id: "sec-9", quantity: "12.000", overrun_reason: "Ek iş emri" },
    ]);
  });
});

describe("invalidQuantityIds / invalidWorkerCountIds", () => {
  it("geçersiz hücreleri görünür hata için raporlar", () => {
    const form: DiaryFormState = {
      ...emptyDiaryForm("2026-08-03"),
      quantities: { "bi-1": "12", "bi-2": "-4" },
      workerCounts: { "company|Kalıpçılar": "3", "general|Yardımcı": "1,5" },
    };

    expect(invalidQuantityIds(form)).toEqual(["bi-2"]);
    expect(invalidWorkerCountIds(form)).toEqual(["general|Yardımcı"]);
  });
});

describe("isDiaryFormDirty", () => {
  it("kayıttan tohumlanmış form kirli DEĞİLDİR", () => {
    const detail = entry();

    expect(isDiaryFormDirty(detail, diaryFormFromEntry(detail))).toBe(false);
  });

  it("not alanlarında yalnız baştaki/sondaki boşluk farkı kirlilik SAYILMAZ", () => {
    const detail = entry();
    const form: DiaryFormState = {
      ...diaryFormFromEntry(detail),
      workDone: "  6. kat döşeme betonu döküldü.  ",
    };

    expect(isDiaryFormDirty(detail, form)).toBe(false);
  });

  it("sıcaklık aynı sayının farklı yazımıysa kirlilik SAYILMAZ", () => {
    const detail = entry();
    const form: DiaryFormState = { ...diaryFormFromEntry(detail), tempMaxC: "28,0" };

    expect(isDiaryFormDirty(detail, form)).toBe(false);
  });

  it("PLN-F2.1: min sıcaklık ya da rüzgâr değişince kirlidir", () => {
    const detail = entry();

    expect(isDiaryFormDirty(detail, { ...diaryFormFromEntry(detail), tempMinC: "10" })).toBe(true);
    expect(isDiaryFormDirty(detail, { ...diaryFormFromEntry(detail), windMs: "2" })).toBe(true);
  });

  it("miktar hücresi değişince kirlidir (türev sütunları uyarısı açılır)", () => {
    const detail = entry();
    const form: DiaryFormState = {
      ...diaryFormFromEntry(detail),
      quantities: { "bi-1": "130" },
    };

    expect(isDiaryFormDirty(detail, form)).toBe(true);
  });

  it("işçi hücresi değişince kirlidir", () => {
    const detail = entry();
    const form: DiaryFormState = {
      ...diaryFormFromEntry(detail),
      workerCounts: { "company|Kalıpçılar": "13" },
    };

    expect(isDiaryFormDirty(detail, form)).toBe(true);
  });

  it("İSG anahtarı değişince kirlidir", () => {
    const detail = entry();
    const form: DiaryFormState = { ...diaryFormFromEntry(detail), ppeChecked: false };

    expect(isDiaryFormDirty(detail, form)).toBe(true);
  });
});
