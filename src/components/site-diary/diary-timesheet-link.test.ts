import { describe, it, expect } from "vitest";

import { isoWeekOf, parseIsoWeek } from "@/components/timesheet/iso-week";
import { routes } from "@/lib/routes";

import { diaryTimesheetHref } from "./diary-timesheet-link";

// PLN-F2.1b · "Puantaja git →" (G12a boş hâl). Hedef ŞANTİYENİN puantaj
// sekmesidir ve o günün HAFTASI seçili açılır. Puantaj ekranı haftayı
// `?iso_year=&iso_week=` ile okur (`SiteTimesheetView.tsx` `parseIsoWeek`);
// üretilen bağlantı aynı ayrıştırıcıdan geri okunarak doğrulanır.

describe("diaryTimesheetHref", () => {
  it("yol routes.ts'in şantiye puantajı üreticisidir", () => {
    const href = diaryTimesheetHref({ projectKey: "p-1", siteKey: "s-1", day: "2026-09-24" });

    expect(href.split("?")[0]).toBe(routes.projects.sites.timesheet({ projectId: "p-1", siteId: "s-1" }));
  });

  it("sorgu o günün ISO haftasını taşır — puantaj ekranının ayrıştırıcısı aynı haftayı okur", () => {
    const day = "2026-01-01"; // ISO 2026-W01 (Perşembe)
    const href = diaryTimesheetHref({ projectKey: "p-1", siteKey: "s-1", day });
    const query = new URLSearchParams(href.split("?")[1]);

    expect(parseIsoWeek(query.get("iso_year"), query.get("iso_week"))).toEqual(isoWeekOf(day));
  });

  it("yıl sınırında ISO yılı takvim yılından ayrılır (2027-01-01 → 2026-W53)", () => {
    const href = diaryTimesheetHref({ projectKey: "p-1", siteKey: "s-1", day: "2027-01-01" });
    const query = new URLSearchParams(href.split("?")[1]);

    expect(query.get("iso_year")).toBe("2026");
    expect(query.get("iso_week")).toBe("53");
  });
});
