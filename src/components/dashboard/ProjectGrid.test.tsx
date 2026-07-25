import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectGrid } from "./ProjectGrid";

function makeProjects(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `1111111${i}-1111-1111-1111-111111111111`,
    code: `P-${i}`,
    name: `Proje ${i}`,
    status: "active" as const,
    budget: "1000000.00",
    progress_pct: "10.00",
  }));
}

describe("ProjectGrid", () => {
  it("proje yoksa bos durum basar", () => {
    render(<ProjectGrid projects={[]} />);
    expect(screen.getByText("Henüz proje tanımlanmadı")).toBeInTheDocument();
  });

  it("uc projeyi basar", () => {
    render(<ProjectGrid projects={makeProjects(3)} />);
    expect(screen.getAllByText(/^Proje \d$/)).toHaveLength(3);
  });

  it("yedi projeyi de basar", () => {
    render(<ProjectGrid projects={makeProjects(7)} />);
    expect(screen.getAllByText(/^Proje \d$/)).toHaveLength(7);
  });
});
