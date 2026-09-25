import { describe, it, expect } from "vitest";

import { buildGeneralReportLinks, buildSiteReportLinks } from "./report-links";

// PLN-F3.6a · `ReportLinks`in TEK üreticisi — ekranlar kendi yol KURMAZ (URL-1).

describe("buildSiteReportLinks", () => {
  const links = buildSiteReportLinks({ projectId: "p-1", siteId: "s-1" });

  it("diary: gün verilmezse tarihsiz, verilirse ?tarih=", () => {
    expect(links.diary()).toBe("/projeler/p-1/santiyeler/s-1/gunluk-kayit");
    expect(links.diary("2026-09-24")).toBe("/projeler/p-1/santiyeler/s-1/gunluk-kayit?tarih=2026-09-24");
  });

  it("budget/panel sabit dizge", () => {
    expect(links.budget).toBe("/projeler/p-1/santiyeler/s-1/adam-saat-butcesi");
    expect(links.panel).toBe("/projeler/p-1/santiyeler/s-1/planlama-paneli");
  });

  it("dailyReport: tarih verilmezse tarihsiz, verilirse ?tarih=", () => {
    expect(links.dailyReport()).toBe("/projeler/p-1/santiyeler/s-1/gunluk-ilerleme-raporu");
    expect(links.dailyReport("2026-09-24")).toBe(
      "/projeler/p-1/santiyeler/s-1/gunluk-ilerleme-raporu?tarih=2026-09-24",
    );
  });

  it("weeklyReport: hafta verilmezse haftasız, verilirse ?hafta=", () => {
    expect(links.weeklyReport()).toBe("/projeler/p-1/santiyeler/s-1/haftalik-qurr");
    expect(links.weeklyReport(12)).toBe("/projeler/p-1/santiyeler/s-1/haftalik-qurr?hafta=12");
  });
});

describe("buildGeneralReportLinks", () => {
  const links = buildGeneralReportLinks("s-9");

  it("diary: seçili şantiyeyi TAŞIR (?site=)", () => {
    expect(links.diary()).toBe("/gunluk-kayit?site=s-9");
    expect(links.diary("2026-09-24")).toBe("/gunluk-kayit?site=s-9&tarih=2026-09-24");
  });

  it("budget/panel HER İKİSİ de ?site= TAŞIR (lider denetimi F3.6a-ek — QURR↔GİR↔Panel geçişinde şantiye AYNI kalır)", () => {
    expect(links.budget).toBe("/planlama/adam-saat-butcesi?site=s-9");
    expect(links.panel).toBe("/planlama/panel?site=s-9");
  });

  it("dailyReport: ?site= HER ZAMAN, tarih verilirse ?tarih= de", () => {
    expect(links.dailyReport()).toBe("/planlama/gunluk-rapor?site=s-9");
    expect(links.dailyReport("2026-09-24")).toBe("/planlama/gunluk-rapor?site=s-9&tarih=2026-09-24");
  });

  it("weeklyReport: ?site= HER ZAMAN, hafta verilirse ?hafta= de", () => {
    expect(links.weeklyReport()).toBe("/planlama/haftalik-qurr?site=s-9");
    expect(links.weeklyReport(21)).toBe("/planlama/haftalik-qurr?site=s-9&hafta=21");
  });

  it("boş siteId'de HİÇBİR bağlantı ?site= taşımaz (uydurma değer yok)", () => {
    const empty = buildGeneralReportLinks("");
    expect(empty.diary()).toBe("/gunluk-kayit");
    expect(empty.budget).toBe("/planlama/adam-saat-butcesi");
    expect(empty.panel).toBe("/planlama/panel");
    expect(empty.dailyReport()).toBe("/planlama/gunluk-rapor");
    expect(empty.weeklyReport()).toBe("/planlama/haftalik-qurr");
  });
});
