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

describe("PanelWarningsCard", () => {
  it("fikstürdeki uyarı sayısını rozette basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} />);
    // 5 uyarının hepsi görünür kapsamda (fikstürün disiplin node_id'leri VISIBLE_ROWS'ta).
    expect(screen.getByText(String(FIXTURE.warnings.length))).toBeInTheDocument();
  });

  it("her uyarı rozet etiketini (PF/SAAT/MİKTAR/GÜNLÜK/ORAN) basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} />);
    expect(screen.getByText("PF")).toBeInTheDocument();
    expect(screen.getByText("SAAT")).toBeInTheDocument();
    expect(screen.getByText("MİKTAR")).toBeInTheDocument();
    expect(screen.getByText("GÜNLÜK")).toBeInTheDocument();
    expect(screen.getByText("ORAN")).toBeInTheDocument();
  });

  it("boş kapsamda (görünür satır yok) yalnız gün hedefli uyarılar kalır", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={[]} links={LINKS} />);
    // Fikstürde iki gün-hedefli uyarı var (undistributed_hours, missing_diary).
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("hiç uyarı görünmüyorsa 'uyarı yok' metni basılır, rozet basılmaz", () => {
    render(<PanelWarningsCard warnings={[]} visibleRows={VISIBLE_ROWS} links={LINKS} />);
    expect(screen.getByText("Görünür kapsamda uyarı yok.")).toBeInTheDocument();
  });

  it("MİKTAR uyarısı S9 biçiminde miktar/planlı/uom/yüzde basar", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} />);
    expect(screen.getByText(/1\.284 \/ 1\.250 m³ \(%/)).toBeInTheDocument();
  });

  it("bağlantısı olan uyarı <a> olarak basılır, hedefi warningMeta.destination'a göre çözülür", () => {
    render(<PanelWarningsCard warnings={FIXTURE.warnings} visibleRows={VISIBLE_ROWS} links={LINKS} />);
    const link = screen.getByText("3 kalem PF bant dışı (< 0,95)").closest("a");
    expect(link).toHaveAttribute("href", "/planlama/gunluk-rapor");
  });
});
