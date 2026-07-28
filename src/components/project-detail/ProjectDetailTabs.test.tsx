import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectDetailTabs } from "./ProjectDetailTabs";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const BASE = `/projeler/${PROJECT_ID}`;

describe("ProjectDetailTabs", () => {
  it("bes sekmeyi de gorunur basar (spec §7.3 — yazilmamis sekmeler gizlenmez)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} />);
    expect(screen.getByRole("tablist", { name: "Proje detay sekmeleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Belgeler" })).toBeInTheDocument();
  });

  it("aktif yol Santiyeler sekmesini isaretler", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} />);
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("yazilmamis sekmelerde title 'Bu bolum yakinda' der, aria-disabled verilmez", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} />);
    const pending = screen.getByRole("tab", { name: "İş Kalemleri" });
    expect(pending).toHaveAttribute("title", "Bu bölüm yakında");
    expect(pending).not.toHaveAttribute("aria-disabled");
    expect(pending).toHaveAttribute("href", `${BASE}/is-kalemleri`);
  });

  it("Santiyeler sekmesinde title verilmez — gercek rota", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} />);
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).not.toHaveAttribute("title");
  });

  it("her sekme projectId'ye gore kendi rotasina baglanir", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} />);
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
      "href",
      `${BASE}/isveren-hakedis`,
    );
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toHaveAttribute(
      "href",
      `${BASE}/taseron-hakedis`,
    );
    expect(screen.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
      "href",
      `${BASE}/belgeler`,
    );
  });
});
