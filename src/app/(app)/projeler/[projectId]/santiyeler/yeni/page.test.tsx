import fs from "node:fs";
import path from "node:path";

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import NewSitePage from "./page";

vi.mock("@/components/site-form/SiteCreateView", () => ({
  SiteCreateView: () => <div data-testid="site-create-view" />,
}));

/** `src/app/(app)/projeler/[projectId]/santiyeler` — rota kardeşlerinin kökü. */
const SITES_ROUTE_DIR = path.resolve(__dirname, "..");

describe("Yeni Şantiye rotası", () => {
  // T5 riski: `/santiyeler/yeni` yolu `[siteId]` dinamik segmentine de uyar.
  // Next.js statik segmenti dinamikten ÖNCE eşler; bu testler o kuralın
  // dayandığı dosya düzenini (statik `yeni/` klasörü, ayrı `[siteId]/`
  // klasörü) sabitler — biri silinirse/taşınırsa kırılır.
  it("'yeni' segmenti [siteId] dinamik segmentinden once eslesir", () => {
    const staticPage = path.join(SITES_ROUTE_DIR, "yeni", "page.tsx");
    const dynamicPage = path.join(SITES_ROUTE_DIR, "[siteId]", "page.tsx");

    expect(fs.existsSync(staticPage)).toBe(true);
    expect(fs.existsSync(dynamicPage)).toBe(true);

    // İkisi de aynı seviyede AYRI klasörlerdir; statik olan dinamiğin içinde
    // değildir (içinde olsaydı `/santiyeler/yeni` dinamik segmente düşerdi).
    const segments = fs
      .readdirSync(SITES_ROUTE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(segments).toContain("yeni");
    expect(segments).toContain("[siteId]");
  });

  it("santiyeler altinda tek bir dinamik segment vardir", () => {
    const dynamicSegments = fs
      .readdirSync(SITES_ROUTE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("["))
      .map((entry) => entry.name);

    expect(dynamicSegments).toEqual(["[siteId]"]);
  });

  it("sayfa SiteCreateView'i render eder", () => {
    render(<NewSitePage />);
    expect(screen.getByTestId("site-create-view")).toBeInTheDocument();
  });
});
