import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PanelWarningsCard } from "./PanelWarningsCard";
import { panelReportFixture } from "./panel-fixtures";
import { buildPanelTree } from "./panel-tree";
import { visibleRows as flattenVisible } from "../../common/tree-table/tree-rows";
import type { ReportLinks } from "../kit/report-screen";

const FIXTURE = panelReportFixture();
const ALL_EXPANDED = new Set(FIXTURE.rows.map((r) => r.node_id ?? "").filter((id) => id !== ""));
const VISIBLE_ROWS = flattenVisible(buildPanelTree(FIXTURE.rows), ALL_EXPANDED).map((r) => r.node.data);

const LINKS: ReportLinks = {
  diary: (day) => `/gunluk-kayit${day ? `?tarih=${day}` : ""}`,
  budget: "/planlama/adam-saat-butcesi",
  dailyReport: (date) => `/planlama/gunluk-rapor${date ? `?tarih=${date}` : ""}`,
  weeklyReport: () => "/planlama/haftalik-qurr",
  panel: "/planlama/panel",
};

/** `pf_bands.cumulative.red_below` fikstürden — "< 0,95" eşiği. */
const PF_RED_BELOW = FIXTURE.pf_bands!.cumulative.red_below;
const KPI = FIXTURE.kpi;

describe("PanelWarningsCard", () => {
  /**
   * PLN-F3.6b LİDER PLANI §4 + LİDER DENETİMİ: backend fikstürde ÜÇ ayrı
   * `pf_out_of_band` + İKİ ayrı `missing_diary` uyarısı var, ama rozet
   * GÖRÜNÜR SATIR sayısını basar — her ikisi de TEK satıra gruplanır. 3 PF +
   * SAAT + MİKTAR + 2 GÜNLÜK + ORAN = 8 backend uyarısı → 5 GÖRÜNÜR satır
   * (mockup "5").
   */
  it("gruplanmış GÖRÜNÜR satır sayısını rozette basar (backend uyarı sayısını DEĞİL)", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(FIXTURE.warnings.length).toBe(8);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("her uyarı rozet etiketini (PF/SAAT/MİKTAR/GÜNLÜK/ORAN) basar, sıra mockup'la BİREBİR", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    const badges = screen.getAllByText(/^(PF|SAAT|MİKTAR|GÜNLÜK|ORAN)$/).map((el) => el.textContent);
    expect(badges).toEqual(["PF", "SAAT", "MİKTAR", "GÜNLÜK", "ORAN"]);
  });

  it("PF grubu TEK satırda 'N kalem PF bant dışı (< eşik)' + üç kalemin ADI+DEĞERİ basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText("3 kalem PF bant dışı (< 0,95)")).toBeInTheDocument();
    expect(screen.getByText("İç sıva 0,84 · Tuğla duvar 0,88 · Temiz su borusu 0,93")).toBeInTheDocument();
  });

  /** LİDER DENETİMİ: GÜNLÜK de PF İLE AYNI DESEN — TEK karta, iki gün + "gün kilitlenmedi" kuyruğu. */
  it("GÜNLÜK grubu TEK satırda 'N günlük gönderilmedi' + iki günün TARİH+KISA GÜN ADI basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText("2 günlük gönderilmedi")).toBeInTheDocument();
    expect(screen.getByText("21.09.2026 Pzt · 23.09.2026 Çar — gün kilitlenmedi")).toBeInTheDocument();
  });

  /** LİDER DENETİMİ: SAAT alt satırı yalnız tarih DEĞİL, puantaj+dağıtılan da içerir (KPI'dan). */
  it("SAAT alt satırı 'tarih puantajı N · dağıtılan M' basar (kpi'dan)", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText(`24.09.2026 puantajı ${KPI!.timesheet_total_day} · dağıtılan ${KPI!.spent_day}`)).toBeInTheDocument();
  });

  /** LİDER DENETİMİ: ORAN sabit "— bütçe ve kazanılmış hesaplanamıyor" kuyruğu taşır. */
  it("ORAN alt satırı sabit açıklama kuyruğu taşır", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText("Buat/priz montajı · Çatı — bütçe ve kazanılmış hesaplanamıyor")).toBeInTheDocument();
  });

  it("boş kapsamda (görünür satır yok) yalnız gün hedefli uyarılar kalır", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={[]} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    // Fikstürde gün-hedefli uyarılar: 1 SAAT + 2 GÜNLÜK (TEK gruba toplanır) = 2 GÖRÜNÜR satır; PF grubu OLUŞMAZ (0 kalem).
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("PF")).toBeNull();
  });

  it("hiç uyarı görünmüyorsa 'uyarı yok' metni basılır, rozet basılmaz", () => {
    render(<PanelWarningsCard warnings={[]} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText("Görünür kapsamda uyarı yok.")).toBeInTheDocument();
  });

  it("MİKTAR uyarısı S9 biçiminde miktar/planlı/uom/yüzde basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    expect(screen.getByText(/1\.284 \/ 1\.250 m³ \(%/)).toBeInTheDocument();
  });

  it("PF grubunun bağlantısı warningMeta('pf_out_of_band').destination'a göre çözülür", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    const link = screen.getByText("3 kalem PF bant dışı (< 0,95)").closest("a");
    expect(link).toHaveAttribute("href", "/planlama/gunluk-rapor");
  });

  /** LİDER DENETİMİ: SAAT satırının ZEMİNİ (yalnız rozet DEĞİL) amber vurgulu. */
  it("SAAT satırının TAMAMI amber zemin sınıfını taşır", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    const row = screen.getByText("SAAT").closest(".ev-panel-warnings__row");
    expect(row).toHaveClass("ev-panel-warnings__row--warning");
  });

  /**
   * 🔴 LİDER DENETİMİ KUSURU (2. tur, mockup Panel:234-243 ölçümü) — MİKTAR
   * rozeti SAAT ile AYNI "warning" tonunda ama satır zemini DÜZ BEYAZ olmalı;
   * ÖNCEDEN `tone==="warning"` KOŞULU MİKTAR satırını da amber boyuyordu.
   */
  it("MİKTAR satırı amber ZEMİN sınıfını TAŞIMAZ (rozet tonu ile satır vurgusu AYRI)", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    const row = screen.getByText("MİKTAR").closest(".ev-panel-warnings__row");
    expect(row).not.toHaveClass("ev-panel-warnings__row--warning");
  });

  /**
   * LİDER DENETİMİ: satırlar altı çizili DEĞİL (mockup düz metin gibi
   * görünür) — `text-decoration:none` `panel-warnings.css`teki
   * `.ev-panel-warnings__row` KURALINDA yaşar (jsdom stil hesaplamaz, bu
   * yüzden test yalnız SINIFIN uygulandığını doğrular; CSS kuralının
   * KENDİSİ `panel-warnings.css`te elle okunarak doğrulanmalıdır).
   */
  it("bağlantılı satır `.ev-panel-warnings__row` sınıfını taşır (alt çizgi kuralının bağlandığı yer)", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} pfRedBelow={PF_RED_BELOW} kpi={KPI} />);
    const link = screen.getByText("3 kalem PF bant dışı (< 0,95)").closest("a")!;
    expect(link).toHaveClass("ev-panel-warnings__row");
    expect(link).toHaveClass("ev-panel-warnings__row--link");
  });
});
