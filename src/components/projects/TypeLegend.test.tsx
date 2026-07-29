import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TypeLegend } from "./TypeLegend";

const counts = { all: 8, taahhut: 4, kendi_yatirim: 2, kat_karsiligi: 2, completed: 2, draft: 0 };

describe("TypeLegend", () => {
  it("uc tip kartini gercek sayaclarla basar", () => {
    render(<TypeLegend counts={counts} />);
    expect(screen.getByText("TAAHHÜT")).toBeInTheDocument();
    expect(screen.getByText("KENDİ YATIRIM")).toBeInTheDocument();
    expect(screen.getByText("KAT KARŞILIĞI")).toBeInTheDocument();
    expect(screen.getByText("4 proje")).toBeInTheDocument();
    expect(screen.getAllByText("2 proje")).toHaveLength(2);
  });

  it("aciklama metinlerini mockuptan aynen basar", () => {
    render(<TypeLegend counts={counts} />);
    expect(screen.getByText(/İşveren adına yapılan işler/)).toBeInTheDocument();
    expect(screen.getByText(/Arsa bize ait, işveren yok/)).toBeInTheDocument();
    expect(screen.getByText(/ünite payı/)).toBeInTheDocument();
  });
});
