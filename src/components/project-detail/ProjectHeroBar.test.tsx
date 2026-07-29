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
  budget: "0",
  progress_pct: "0",
  contracting: null,
  investment: null,
  land_share: null,
  site_count: 2,
};

describe("ProjectHeroBar", () => {
  it("kategori, sehir, baslik ve meta satirini basar (spec §4.1)", () => {
    render(<ProjectHeroBar project={BASE} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("Konut Projesi · Ankara")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Güneşkent Konut" })).toBeInTheDocument();
    expect(screen.getByText(/SZL-2025-001/)).toBeInTheDocument();
    expect(screen.getByText(/İşveren: Güneşkent Gayrimenkul A\.Ş\./)).toBeInTheDocument();
  });

  it("Toplam Sozlesme yer tutucudur — '—' basar, title'da contracts aciklamasi verir (spec §7.1)", () => {
    render(<ProjectHeroBar project={BASE} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("Toplam Sözleşme")).toBeInTheDocument();
    const value = screen.getByTitle("Sözleşme modülüyle birlikte gelir");
    expect(value).toHaveTextContent("—");
  });

  it("santiye sayisini gercek veriden basar (yer tutucu degil)", () => {
    render(<ProjectHeroBar project={BASE} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByText("2 şantiye")).toBeInTheDocument();
  });

  it("isveren/sozlesme no eksikken meta satirini zarifce daraltir", () => {
    const noEmployer: ProjectDetail = { ...BASE, employer_name: null, contract_no: null };
    render(<ProjectHeroBar project={noEmployer} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.queryByText(/İşveren:/)).not.toBeInTheDocument();
  });

  it("sekme barini icerir", () => {
    render(<ProjectHeroBar project={BASE} activePath={`/projeler/${BASE.id}`} />);
    expect(screen.getByRole("tablist", { name: "Proje detay sekmeleri" })).toBeInTheDocument();
  });
});
