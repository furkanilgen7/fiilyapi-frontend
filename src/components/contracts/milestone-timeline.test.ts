import { describe, it, expect } from "vitest";

import type { TimelineProject } from "@/lib/api/hooks/useProjectTimeline";

import {
  buildMilestoneTimeline,
  milestoneState,
  sectionRangeLabel,
} from "./milestone-timeline";

/**
 * F-MILESTONE · kartın SAF aritmetiği.
 *
 * 🔴 FİKSTÜR ÜRÜNÜN GERÇEK VERİ ŞEKLİNDEN kurulur (`e2e/mock-backend.ts`nin
 * `sec-1`/`sec-2`/`sec-3` tohumu birebir): iki milestone'lu AKTİF bir bölüm,
 * tek milestone'lu TAMAMLANMIŞ bir bölüm, tarihsiz + milestone'suz bir bölüm.
 * Bekçi ölçtüğü yolu kendisi "uygun" hâle getirmez.
 */
const TODAY = "2026-07-17";

function project(overrides: Partial<TimelineProject> & Pick<TimelineProject, "id">): TimelineProject {
  return {
    code: "PRJ-1",
    name: "Kule A",
    status: "active",
    start_date: "2025-03-01",
    end_date: "2026-12-01",
    contract_amount: "11200000",
    sections: [],
    ...overrides,
  };
}

const P1: TimelineProject = project({
  id: "p-1",
  sections: [
    {
      id: "sec-1",
      name: "Kat 6–10 Kaba İnşaat",
      status: "active",
      start_date: "2026-01-01",
      end_date: "2026-09-30",
      sort_order: 0,
      depends_on_section_id: "sec-2",
      milestones: [
        { id: "ms-2", title: "Kaba inşaat teslim", milestone_date: "2026-09-30" },
        { id: "ms-1", title: "Kat 8 döşeme tamamlandı", milestone_date: "2026-05-15" },
      ],
    },
    {
      id: "sec-2",
      name: "Zemin Kat Kaba İnşaat",
      status: "completed",
      start_date: "2025-03-01",
      end_date: "2025-12-01",
      sort_order: 1,
      depends_on_section_id: null,
      milestones: [{ id: "ms-3", title: "Zemin kat teslim", milestone_date: "2025-12-01" }],
    },
    {
      id: "sec-3",
      name: "Peyzaj Düzenlemesi (Taslak)",
      status: "on_hold",
      start_date: null,
      end_date: null,
      sort_order: 2,
      depends_on_section_id: null,
      milestones: [],
    },
  ],
});

const P2: TimelineProject = project({
  id: "p-2",
  code: "PRJ-2",
  name: "Villa B",
  sections: [
    {
      id: "sec-9",
      name: "Villa B temel",
      status: "planned",
      start_date: "2026-02-01",
      end_date: "2026-04-01",
      sort_order: 0,
      depends_on_section_id: null,
      milestones: [{ id: "ms-9", title: "BAŞKA PROJENİN MILESTONE'U", milestone_date: "2026-03-01" }],
    },
  ],
});

const ITEMS = [P1, P2];

/* ─── M2 · durum SUNUCU damgasından türer ────────────────────────────────── */

describe("milestoneState — şema açıklamasının kuralı: KESİN KÜÇÜKTÜR", () => {
  it("geçmiş tarih 'completed'dir", () => {
    expect(milestoneState("2026-05-15", TODAY)).toBe("completed");
  });

  it("gelecek tarih 'planned'dir", () => {
    expect(milestoneState("2026-09-30", TODAY)).toBe("planned");
  });

  /**
   * 🔴 SINIR GÜNÜ — pozitif kontrol. Şema açıklaması `milestone_date < today`
   * der; `==` KÜÇÜK DEĞİLDİR. Bugün olan bir milestone HENÜZ GEÇMEMİŞTİR.
   * `<=`ye kayan bir mutant burada kırmızıya döner.
   */
  it("BUGÜN olan milestone 'completed' DEĞİLDİR (sınır günü)", () => {
    expect(milestoneState(TODAY, TODAY)).toBe("planned");
  });

  it("bir gün öncesi 'completed', bir gün sonrası 'planned'", () => {
    expect(milestoneState("2026-07-16", TODAY)).toBe("completed");
    expect(milestoneState("2026-07-18", TODAY)).toBe("planned");
  });

  it("ayrıştırılamayan tarih TAMAMLANMIŞ SAYILMAZ", () => {
    expect(milestoneState("17.07.2020", TODAY)).toBe("planned");
    expect(milestoneState("2020-01-01", "bugün")).toBe("planned");
  });

  it("yıl sınırını doğru geçer (dize karşılaştırması takvimle uyumlu)", () => {
    expect(milestoneState("2025-12-31", "2026-01-01")).toBe("completed");
    expect(milestoneState("2026-01-01", "2025-12-31")).toBe("planned");
  });
});

/* ─── M? · aralık YALNIZ bölüm düzeyinde ─────────────────────────────────── */

describe("sectionRangeLabel — GERÇEK aralık, uydurma YOK", () => {
  it("aynı yıl: yıl BİR KEZ yazılır (mockup 105 'Nis–Tem 2025')", () => {
    expect(sectionRangeLabel("2025-04-01", "2025-07-31")).toBe("Nis–Tem 2025");
  });

  it("mockup 111'in aralığı fikstürden BİREBİR çıkar", () => {
    expect(sectionRangeLabel("2026-01-01", "2026-09-30")).toBe("Oca–Eyl 2026");
  });

  it("tek ay: aralık çizgisi YOK (mockup 121 'Ara 2026')", () => {
    expect(sectionRangeLabel("2026-12-01", "2026-12-31")).toBe("Ara 2026");
  });

  it("yıl atlayan aralıkta iki yıl da yazılır", () => {
    expect(sectionRangeLabel("2025-08-01", "2026-02-28")).toBe("Ağu 2025–Şub 2026");
  });

  it("tarih eksik/bozuksa aralık UYDURULMAZ", () => {
    expect(sectionRangeLabel(null, "2026-02-28")).toBeNull();
    expect(sectionRangeLabel("2026-01-01", null)).toBeNull();
    expect(sectionRangeLabel("01.01.2026", "2026-02-28")).toBeNull();
  });
});

/* ─── M1 · küme = PROJENİN TÜM BÖLÜMLERİ ─────────────────────────────────── */

describe("buildMilestoneTimeline — küme kararı (2026-08-29)", () => {
  it("projenin TÜM bölümlerinin milestone'ları gelir — TEK bölümle sınırlanmaz", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    expect(result.kind).toBe("groups");
    if (result.kind !== "groups") return;

    // İKİ ayrı bölüm; süzgeci tek bölüme indiren mutant burada kırmızıya döner.
    expect(result.groups.map((g) => g.sectionId)).toEqual(["sec-2", "sec-1"]);
    const titles = result.groups.flatMap((g) => g.milestones.map((m) => m.title));
    expect(titles).toEqual([
      "Zemin kat teslim",
      "Kat 8 döşeme tamamlandı",
      "Kaba inşaat teslim",
    ]);
  });

  it("BAŞKA projenin milestone'ı KÜMEYE GİRMEZ (pozitif kontrol)", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    if (result.kind !== "groups") throw new Error("groups bekleniyordu");
    const titles = result.groups.flatMap((g) => g.milestones.map((m) => m.title));
    expect(titles).not.toContain("BAŞKA PROJENİN MILESTONE'U");
    expect(result.groups.map((g) => g.sectionId)).not.toContain("sec-9");
  });

  it("milestone'SUZ bölüm grup ÜRETMEZ (küme milestone'lardır, bölümler değil)", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    if (result.kind !== "groups") throw new Error("groups bekleniyordu");
    expect(result.groups.map((g) => g.sectionName)).not.toContain("Peyzaj Düzenlemesi (Taslak)");
  });

  it("gruplar KRONOLOJİK: en erken milestone'u olan bölüm önce (sunucu sırası sec-1 idi)", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    if (result.kind !== "groups") throw new Error("groups bekleniyordu");
    // Sunucu `sort_order`la sec-1'i ÖNCE verdi; takvim onu 2026'ya taşıdı.
    expect(result.groups[0]?.sectionId).toBe("sec-2");
  });

  it("grup içi milestone'lar tarih sırasına dizilir (gövde sırası ters geldi)", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    if (result.kind !== "groups") throw new Error("groups bekleniyordu");
    const secOne = result.groups.find((g) => g.sectionId === "sec-1");
    expect(secOne?.milestones.map((m) => m.date)).toEqual(["2026-05-15", "2026-09-30"]);
  });

  it("durum: bölüm ENUM'undan, milestone TARİHTEN", () => {
    const result = buildMilestoneTimeline(ITEMS, "p-1", TODAY);
    if (result.kind !== "groups") throw new Error("groups bekleniyordu");
    const secOne = result.groups.find((g) => g.sectionId === "sec-1");
    expect(secOne?.status).toBe("active");
    expect(secOne?.range).toBe("Oca–Eyl 2026");
    expect(secOne?.milestones.map((m) => m.state)).toEqual(["completed", "planned"]);
  });
});

/* ─── M4 · boş hâl ≠ kapsam dışı hâl ─────────────────────────────────────── */

describe("buildMilestoneTimeline — İKİ AYRI boş hâl", () => {
  it("proje takvimde VAR ama hiç milestone yoksa → 'empty'", () => {
    const bare = project({ id: "p-9", sections: [] });
    expect(buildMilestoneTimeline([bare], "p-9", TODAY)).toEqual({ kind: "empty" });
  });

  it("proje takvimde HİÇ YOKSA → 'out-of-scope' (görünürlük kapısı)", () => {
    expect(buildMilestoneTimeline(ITEMS, "p-404", TODAY)).toEqual({ kind: "out-of-scope" });
  });

  it("iki hâl AYNI DEĞERE ÇÖKMEZ", () => {
    const bare = project({ id: "p-9", sections: [] });
    const empty = buildMilestoneTimeline([bare], "p-9", TODAY);
    const scope = buildMilestoneTimeline([bare], "p-404", TODAY);
    expect(empty).not.toEqual(scope);
  });

  it("boş portföyde bilinmeyen proje 'out-of-scope'tur (milestone yok DEĞİL)", () => {
    expect(buildMilestoneTimeline([], "p-1", TODAY)).toEqual({ kind: "out-of-scope" });
  });
});
