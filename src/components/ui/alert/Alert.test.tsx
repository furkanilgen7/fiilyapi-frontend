import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("alert rolunde icerigi render eder", () => {
    render(<Alert>Bir sorun olustu</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Bir sorun olustu");
  });
  it("type sinifini uygular", () => {
    render(<Alert type="danger">Hata</Alert>);
    expect(screen.getByRole("alert").className).toContain("alert--danger");
  });
  it("baslik verilince basligi render eder", () => {
    render(<Alert title="Uyari">Detay</Alert>);
    expect(screen.getByText("Uyari")).toBeInTheDocument();
  });
});
