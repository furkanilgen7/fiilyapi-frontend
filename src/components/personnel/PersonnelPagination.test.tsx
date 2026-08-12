import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { PersonnelPagination } from "./PersonnelPagination";

describe("PersonnelPagination", () => {
  it("özet metni doğru aralığı basar", () => {
    render(
      <PersonnelPagination page={1} totalPages={3} totalCount={16} pageSize={6} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("16 personelden 1–6 gösteriliyor")).toBeInTheDocument();
  });

  it("son sayfada eksik aralık doğru basılır", () => {
    render(
      <PersonnelPagination page={3} totalPages={3} totalCount={16} pageSize={6} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("16 personelden 13–16 gösteriliyor")).toBeInTheDocument();
  });

  it("sayfa düğmesine tıklamak dışarı taşır", () => {
    const onPageChange = vi.fn();
    render(
      <PersonnelPagination page={1} totalPages={3} totalCount={16} pageSize={6} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sayfa 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("ilk sayfada 'Önceki', son sayfada 'Sonraki' devre-dışıdır", () => {
    render(
      <PersonnelPagination page={1} totalPages={2} totalCount={10} pageSize={6} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Önceki sayfa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sonraki sayfa" })).not.toBeDisabled();
  });

  it("toplam sıfırsa hiçbir şey basmaz", () => {
    const { container } = render(
      <PersonnelPagination page={1} totalPages={1} totalCount={0} pageSize={6} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
