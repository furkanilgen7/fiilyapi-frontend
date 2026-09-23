import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectHeroBar } from "./ProjectHeroBar";
import type { ProjectDetail } from "@/lib/api/hooks/useProjects";

const BASE: ProjectDetail = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "SZL-2025-001",
  name: "Güneşkent Konut",
  project_type: "taahhut",
  category: "Konut Projesi",
  city: "Ankara",
  status: "active",
  start_date: null,
  end_date: null,
  contract_no: "SZL-2025-001",
  contract_amount: "22400000.00",
  employer_name: "Güneşkent Gayrimenkul A.Ş.",
  employer: null,
  contract: null,
  budget_lines: { material: "0", labor: "0", subcontractor: "0", overhead: "0" },
  is_draft: false,
  budget: "0",
  progress_pct: "0",
  contracting: null,
  investment: null,
  land_share: null,
  site_count: 2,
};

describe("ProjectHeroBar", () => {
  it("kategori, sehir, baslik ve meta satirini basar (spec §4.1)", () => {
    render(<ProjectHeroBar project={BASE} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("Konut Projesi · Ankara")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Güneşkent Konut" })).toBeInTheDocument();
    expect(screen.getByText(/SZL-2025-001/)).toBeInTheDocument();
    expect(screen.getByText(/İşveren: Güneşkent Gayrimenkul A\.Ş\./)).toBeInTheDocument();
  });

  it("Toplam Sozlesme DOLUYSA gercek tutari basar, '—' DEGIL (kayit 109)", () => {
    render(<ProjectHeroBar project={BASE} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("Toplam Sözleşme")).toBeInTheDocument();
    expect(screen.getByText("₺ 22,4M")).toBeInTheDocument();
  });

  it("Toplam Sozlesme NULL ise yer tutucudur — '—' basar, title'da contracts aciklamasi verir (spec §7.1)", () => {
    const noContract: ProjectDetail = { ...BASE, contract_amount: null };
    render(<ProjectHeroBar project={noContract} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    const value = screen.getByTitle("Sözleşme verisi bu yüzeye henüz bağlanmadı");
    expect(value).toHaveTextContent("—");
  });

  it("santiye sayisini gercek veriden basar (yer tutucu degil)", () => {
    render(<ProjectHeroBar project={BASE} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("2 şantiye")).toBeInTheDocument();
  });

  it("isveren/sozlesme no eksikken meta satirini zarifce daraltir", () => {
    const noEmployer: ProjectDetail = { ...BASE, employer_name: null, contract_no: null };
    render(<ProjectHeroBar project={noEmployer} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.queryByText(/İşveren:/)).not.toBeInTheDocument();
  });

  it("sekme barini icerir", () => {
    render(<ProjectHeroBar project={BASE} projectKey={BASE.id} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByRole("navigation", { name: "Proje detay sekmeleri" })).toBeInTheDocument();
  });
});
