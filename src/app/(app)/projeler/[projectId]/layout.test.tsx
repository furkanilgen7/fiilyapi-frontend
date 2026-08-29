import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ProjectDetailLayout from "./layout";

const LAYOUT_PATH = "src/app/(app)/projeler/[projectId]/layout.tsx";

// 🔴 DRILL-KALDIR (kullanıcı kararı 2026-08-29) · REGRESYON BEKÇİSİ.
//
// Bu blok eskiden drill kenar çubuğunun VARLIĞINI bekçiliyordu; artık
// YOKLUĞUNU bekçiliyor. Gerekçe layout.tsx docstring'indedir: çubuk global
// kabuk sidebar'ıyla aynı konumdaydı ve ana menüyü ÖRTÜYORDU. Mockup'lar
// çubuğu ÇİZER — bu ONAYLI SAPMADIR, "mockup çiziyor" diye geri alınamaz.
describe("ProjectDetailLayout — drill kenar çubuğu YOKTUR (ONAYLI SAPMA)", () => {
  it("hiçbir <nav> render etmez (çubuk kalktı, ana menü kabuktan gelir)", () => {
    render(
      <ProjectDetailLayout>
        <div>içerik</div>
      </ProjectDetailLayout>,
    );
    expect(screen.queryAllByRole("navigation")).toHaveLength(0);
  });

  it("hiçbir bağlantı render etmez", () => {
    // 🔴 `getAllByRole("link")` açık `role` taşıyan <a>'ları GÖRMEZ
    // (`<a role="tab">`); bağlantı sayan bekçi querySelectorAll kullanır.
    const { container } = render(
      <ProjectDetailLayout>
        <div>içerik</div>
      </ProjectDetailLayout>,
    );
    expect(container.querySelectorAll("a[href]")).toHaveLength(0);
  });

  it("drill sınıflarından hiçbirini basmaz (.drill-sidebar / .drill-content)", () => {
    const { container } = render(
      <ProjectDetailLayout>
        <div>içerik</div>
      </ProjectDetailLayout>,
    );
    expect(container.querySelectorAll(".drill-sidebar, .drill-content")).toHaveLength(0);
  });

  it("çocuk içeriği SARMALAYICISIZ basar (ofset .app-content'e devredildi)", () => {
    const { container } = render(
      <ProjectDetailLayout>
        <div data-testid="cocuk">merhaba</div>
      </ProjectDetailLayout>,
    );
    expect(screen.getByText("merhaba")).toBeInTheDocument();
    // Çocuk doğrudan köktedir: araya ofset taşıyan bir <div> girmiyor.
    expect(container.firstElementChild).toBe(screen.getByTestId("cocuk"));
  });
});

// Kaynak düzeyi bekçiler — render'la yakalanamayanlar.
describe("DRILL-KALDIR — kaynak düzeyi bekçiler", () => {
  it("drill modülü SİLİNMİŞTİR (ölü kod geri gelmesin)", () => {
    expect(existsSync(join(process.cwd(), "src/components/shell/drill"))).toBe(false);
  });

  it("layout drill modülünü import ETMEZ", () => {
    const source = readFileSync(join(process.cwd(), LAYOUT_PATH), "utf8");
    expect(source).not.toMatch(/^\s*import .*shell\/drill/m);
  });

  it("layout dosyası ONAYLI SAPMA gerekçesini TAŞIR (sessizce geri alınmasın)", () => {
    const source = readFileSync(join(process.cwd(), LAYOUT_PATH), "utf8");
    expect(source).toContain("ONAYLI SAPMA");
  });

  it("layout iki stylesheet'i import ETMEYE DEVAM EDER (ozet/paylasim onlara muhtaç)", () => {
    const source = readFileSync(join(process.cwd(), LAYOUT_PATH), "utf8");
    expect(source).toContain("project-detail/project-detail.css");
    expect(source).toContain("site-detail/site-detail.css");
  });

  it("santiye rota klasoru kendi layout dosyasini TASIMAZ (ic ice kabuk yasak)", () => {
    const siteRouteDir = join(
      process.cwd(),
      "src/app/(app)/projeler/[projectId]/santiyeler/[siteId]",
    );
    const files = readdirSync(siteRouteDir);
    expect(files.filter((f) => /^layout\.(t|j)sx?$/.test(f))).toEqual([]);
  });
});
