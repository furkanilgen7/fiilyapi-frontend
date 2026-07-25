import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./ProjectCard";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GK-A",
  name: "Güneşkent A-Blok",
  budget: "1500000.00",
  progress_pct: "42.50",
};

describe("ProjectCard", () => {
  it("aktif projeyi butce etiketiyle basar", () => {
    render(<ProjectCard project={{ ...base, status: "active" }} />);
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
    expect(screen.getByText("₺ 1,5M")).toBeInTheDocument();
    expect(screen.getByText("Bütçe")).toBeInTheDocument();
    expect(screen.getByText("%42,5 tamamlandı")).toBeInTheDocument();
  });

  it("beklemedeki projeyi etiketler", () => {
    render(<ProjectCard project={{ ...base, status: "on_hold" }} />);
    expect(screen.getByText("Beklemede")).toBeInTheDocument();
  });

  it("tamamlanan projeyi etiketler", () => {
    render(<ProjectCard project={{ ...base, status: "completed", progress_pct: "100.00" }} />);
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
    expect(screen.getByText("%100 tamamlandı")).toBeInTheDocument();
  });
});
