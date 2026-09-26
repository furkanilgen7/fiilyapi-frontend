import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EvQurrReport, EvQurrRow, EvQurrTotal } from "@/lib/api/models";

import { QURR_FIXTURE_READY } from "./qurr-fixtures";
import { buildQurrTree } from "./qurr-tree";
import { QurrPrintView } from "./QurrPrintView";

/**
 * FIX-F2 · Ajan D madde 1 — KANIT + DÜZELTME.
 *
 * Backend `report_qurr.py::build_rows` bir satır ÜRETİR HER `g.items`
 * (disiplin › alt grup › iş tipi) İÇİN — satır sayısı proje WBS'inin
 * büyüklüğüne bağlıdır, mockup fikstüründeki 22 satırla SINIRLI DEĞİL
 * (backend salt okunur ölçüm: `for d in site.tree.disciplines: for g in
 * d.groups: for i in g.items: ... rows.append(row)`).
 *
 * KIRMIZI (KANITLANDI, düzeltmeden ÖNCE): `QurrPrintView` TEK `PrintSheet`
 * render ediyordu (`page={1} pageCount={1}`, sabit); `PrintSheet` sabit
 * yükseklikte (794px) + `overflow: hidden` (`print-sheet.css`).
 * `DailyPrintView` emsalinin aksine (`paginateByGroup` ile L1 sınırında
 * sayfalara böler) HİÇBİR sayfalama mekanizması yoktu — satır sayısı ne
 * olursa olsun tek sayfa üretiliyordu (60 satırda `sheets.length === 1`).
 *
 * YEŞİL (düzeltme sonrası, S34 kullanıcı kararı): `QurrPrintView` artık
 * `paginateByGroup` ile GİR desenini kullanır — 60 satırlık WBS'te BİRDEN
 * FAZLA `.ev-print-sheet` üretir.
 *
 * jsdom CSS uygulamadığı için taşan satırların EKRANDA kesildiğini ölçemeyiz;
 * kanıt DOM yapısı üzerinden kurulur: büyük bir WBS'te (5 disiplin × 12 satır
 * = 60 satır — mockup'ın 22 satırlık tek sayfa fikstüründen kat kat büyük)
 * `QurrPrintView` sayfalamasız TEK `.ev-print-sheet` üretiyordu; sabit
 * yükseklikli/`overflow:hidden` bir çerçevede sayfalamasız büyüyen satır
 * sayısı = satırların sessizce (görsel olarak) kesilmesi demekti.
 */
function buildLargeQurrFixture(disciplineCount: number, itemsPerDiscipline: number): EvQurrReport {
  const rowTemplate = QURR_FIXTURE_READY.rows[0] as EvQurrRow;
  const disciplineTotalTemplate = QURR_FIXTURE_READY.totals.find((t) => t.kind === "discipline") as EvQurrTotal;
  const groupTotalTemplate = QURR_FIXTURE_READY.totals.find((t) => t.kind === "group") as EvQurrTotal;

  const rows: EvQurrRow[] = [];
  const totals: EvQurrTotal[] = [];

  for (let d = 0; d < disciplineCount; d++) {
    const discId = `D${d}`;
    const groupId = `D${d}.G`;
    totals.push({ ...disciplineTotalTemplate, node_id: discId, parent_id: null, code: discId, name: `Disiplin ${d}` });
    totals.push({ ...groupTotalTemplate, node_id: groupId, parent_id: discId, code: groupId, name: `Alt grup ${d}` });
    for (let i = 0; i < itemsPerDiscipline; i++) {
      rows.push({
        ...rowTemplate,
        node_id: `${groupId}.${i}`,
        parent_id: groupId,
        code: `${groupId}.${i}`,
        name: `İş tipi ${d}-${i}`,
      });
    }
  }

  return { ...QURR_FIXTURE_READY, rows, totals };
}

function renderQurr(report: EvQurrReport) {
  const tree = buildQurrTree(report.rows, report.totals);
  return render(
    <QurrPrintView data={report} tree={tree} companyName="FİİL Yapı" projectName="Güneşkent Konut" siteName="A-Blok Şantiyesi" />,
  );
}

describe("QurrPrintView — büyük WBS'te sayfalama (FIX-F2 Ajan D madde 1)", () => {
  it("60 satırlık (mockup'ın 22 satırlık tek-sayfa fikstüründen büyük) raporda BİRDEN FAZLA sayfa üretmesi beklenir", () => {
    const report = buildLargeQurrFixture(5, 12);
    expect(report.rows.length).toBe(60);

    const { container } = renderQurr(report);

    const sheets = container.querySelectorAll(".ev-print-sheet");
    expect(sheets.length).toBeGreaterThan(1);
  });

  it("KISA mockup fikstürü (22-24 görünür satır) kapasitenin ALTINDA kalır → TEK sayfa, DOM önceki (sayfalamasız) hâlle AYNI", () => {
    const { container } = renderQurr(QURR_FIXTURE_READY);

    const sheets = container.querySelectorAll(".ev-print-sheet");
    expect(sheets.length).toBe(1);
    // "(devam)" hiçbir yerde basılmaz, lejant tek sayfada basılır, etiket "1 sayfa" der (görsel/ekran testleriyle AYNI metin).
    expect(container.querySelector(".qurr-print__title")?.textContent).not.toContain("(devam)");
    expect(container.querySelector(".qurr-print__formula-legend")).not.toBeNull();
    expect(container.querySelector(".qurr-print-wrap__label")?.textContent).toBe(
      "A4 yatay · 1 sayfa · 18 kolon sayfaya sığdırıldı",
    );
  });

  it("tek disiplin kapasiteden BÜYÜK → zorunlu bölünür: 2. sayfa '(devam)' basar, ilk sayfa BASMAZ", () => {
    // 1 disiplin + 1 alt grup + 40 iş tipi = 42 görünür satır > QURR_ROWS_PER_PAGE (32) → zorunlu bölünme.
    const report = buildLargeQurrFixture(1, 40);
    const { container } = renderQurr(report);

    const sheets = Array.from(container.querySelectorAll(".ev-print-sheet"));
    expect(sheets.length).toBeGreaterThan(1);

    const titles = sheets.map((sheet) => sheet.querySelector(".qurr-print__title")?.textContent ?? "");
    expect(titles[0]).not.toContain("(devam)");
    expect(titles[1]).toContain("(devam)");
  });

  it("formül lejantı YALNIZ son sayfada basılır (çok sayfalı raporda)", () => {
    const report = buildLargeQurrFixture(1, 40);
    const { container } = renderQurr(report);

    const sheets = Array.from(container.querySelectorAll(".ev-print-sheet"));
    expect(sheets.length).toBeGreaterThan(1);

    sheets.slice(0, -1).forEach((sheet) => {
      expect(sheet.querySelector(".qurr-print__formula-legend")).toBeNull();
    });
    expect(sheets[sheets.length - 1]?.querySelector(".qurr-print__formula-legend")).not.toBeNull();
  });

  it("başlık/eyebrow HER sayfada tekrar eder (çok sayfalı raporda)", () => {
    const report = buildLargeQurrFixture(1, 40);
    const { container } = renderQurr(report);

    const sheets = Array.from(container.querySelectorAll(".ev-print-sheet"));
    expect(sheets.length).toBeGreaterThan(1);

    sheets.forEach((sheet) => {
      expect(sheet.querySelector(".qurr-print__eyebrow")?.textContent).toBe("FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi");
      expect(sheet.querySelector(".qurr-print__title")?.textContent).toContain("Haftalık Miktar & Birim Oran Raporu (QURR)");
    });
  });

  it("disiplin sınırında kırılır: bir disiplin kapasiteye sığıyorsa BÖLÜNMEZ, bütünüyle sonraki sayfaya taşınır", () => {
    // 2 disiplin, her biri (1 disiplin toplamı + 1 alt grup toplamı + 18 iş tipi = 20 satır) kapasiteye (32) TEK BAŞINA sığar,
    // ama ikisi TOPLAM (40) sığmaz → ikinci disiplin BÖLÜNMEDEN 2. sayfaya geçmeli.
    const report = buildLargeQurrFixture(2, 18);
    const { container } = renderQurr(report);

    const sheets = Array.from(container.querySelectorAll(".ev-print-sheet"));
    expect(sheets.length).toBe(2);

    // Hiçbiri zorunlu bölünme DEĞİL (disiplin sınırında tam kırılma) → "(devam)" hiçbir sayfada basılmaz.
    sheets.forEach((sheet) => {
      expect(sheet.querySelector(".qurr-print__title")?.textContent).not.toContain("(devam)");
    });

    // "Disiplin 0"in iş tipleri yalnız 1. sayfada, "Disiplin 1"inkiler yalnız 2. sayfada.
    expect(sheets[0]?.textContent).toContain("İş tipi 0-0");
    expect(sheets[0]?.textContent).not.toContain("İş tipi 1-0");
    expect(sheets[1]?.textContent).toContain("İş tipi 1-0");
    expect(sheets[1]?.textContent).not.toContain("İş tipi 0-0");
  });
});
