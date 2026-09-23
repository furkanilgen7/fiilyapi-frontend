import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteDocumentsPage from "./page";

// Kayıt 69/387 — `SiteDocumentsView` `useSearchParams` çağırır; Next 15'te bu
// hook Suspense sınırı GEREKTİRİR (sarılmazsa sayfa build'de prerender hatası
// verir). Kardeş rotalar (`/stok`, `/puantaj`, kök `/belgeler`) hepsi
// `<Suspense>` sarar, bu sayfa unutulmuştu.
vi.mock("@/components/documents/SiteDocumentsView", () => ({
  SiteDocumentsView: () => <div data-testid="site-documents-stub" />,
}));

describe("SiteDocumentsPage rotası — Suspense sınırı (kayıt 69/387)", () => {
  it("SiteDocumentsView'i Suspense içinde basar", () => {
    render(<SiteDocumentsPage />);
    expect(screen.getByTestId("site-documents-stub")).toBeInTheDocument();
  });

  it("kaynakta gerçekten <Suspense> KULLANIR (davranışsal testin göremediği eşdeğer mutant bekçisi)", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        "src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/belgeler/page.tsx",
      ),
      "utf8",
    );
    expect(source).toMatch(/import\s*{\s*Suspense\s*}\s*from\s*"react"/);
    expect(source).toMatch(/<Suspense>\s*\n?\s*<SiteDocumentsView/);
  });
});
