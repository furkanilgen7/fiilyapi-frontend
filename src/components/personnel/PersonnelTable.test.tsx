import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PersonnelTable } from "./PersonnelTable";
import type { PersonnelDeriveItem } from "./personnel-derive";

function row(overrides: Partial<PersonnelDeriveItem> = {}): PersonnelDeriveItem {
  return {
    id: "per-1",
    full_name: "Mehmet Kılıç",
    trade: "Kalıpçı",
    source: "company",
    subcontractor_id: null,
    user_id: null,
    is_active: true,
    ...overrides,
  };
}

describe("PersonnelTable", () => {
  it("Ad Soyad basılır ama 'İşe giriş' alt satırı BASILMAZ (K6)", () => {
    render(<PersonnelTable rows={[row()]} isLoading={false} isError={false} hasFilter={false} />);
    expect(screen.getByText("Mehmet Kılıç")).toBeInTheDocument();
    expect(screen.queryByText(/İşe giriş/)).not.toBeInTheDocument();
  });

  it("Tür rozeti WORKER_SOURCE_LABELS'ten gelir (Şirket/Taşeron/Genel)", () => {
    render(
      <PersonnelTable
        rows={[
          row({ id: "1", source: "company" }),
          row({ id: "2", source: "subcontractor" }),
          row({ id: "3", source: "general" }),
        ]}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    expect(screen.getByText("Şirket")).toBeInTheDocument();
    expect(screen.getByText("Taşeron")).toBeInTheDocument();
    expect(screen.getByText("Genel")).toBeInTheDocument();
  });

  it("Proje/SGK/Ücret-Gün sütunları basılır, hücreler pending '—' + gerekçe taşır (K1)", () => {
    render(<PersonnelTable rows={[row()]} isLoading={false} isError={false} hasFilter={false} />);
    expect(screen.getByRole("columnheader", { name: "Proje" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SGK" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ücret/Gün" })).toBeInTheDocument();

    const projectCell = screen.getByTestId("personel-project-pending-per-1");
    expect(projectCell).toHaveTextContent("—");
    expect(projectCell).toHaveAttribute("title", expect.stringContaining("personel kaydında henüz yok"));
  });

  it("Meslek yoksa '—' basılır (uydurma meslek YOK)", () => {
    render(<PersonnelTable rows={[row({ trade: null })]} isLoading={false} isError={false} hasFilter={false} />);
    const cells = within(screen.getByTestId("personel-row-per-1")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("—"); // Meslek sütunu
  });

  it("Durum rozeti is_active'ten gelir", () => {
    render(
      <PersonnelTable
        rows={[row({ id: "1", is_active: true }), row({ id: "2", is_active: false })]}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Pasif")).toBeInTheDocument();
  });

  it("Detay bağlantısı doğru rotaya gider", () => {
    render(<PersonnelTable rows={[row()]} isLoading={false} isError={false} hasFilter={false} />);
    expect(screen.getByRole("link", { name: "Detay" })).toHaveAttribute("href", "/personel/per-1");
  });

  it("boş liste (süzgeçsiz) sade Türkçe boş-durum metni gösterir", () => {
    render(<PersonnelTable rows={[]} isLoading={false} isError={false} hasFilter={false} />);
    expect(screen.getByText("Henüz personel kaydı yok.")).toBeInTheDocument();
  });

  it("boş liste (süzgeçli) AYRI bir boş-durum metni gösterir", () => {
    render(<PersonnelTable rows={[]} isLoading={false} isError={false} hasFilter={true} />);
    expect(screen.getByText("Bu arama/filtreyle eşleşen personel yok.")).toBeInTheDocument();
  });

  it("yüklenirken/hatada satır BASILMAZ, uygun mesaj basılır", () => {
    const { rerender } = render(
      <PersonnelTable rows={undefined} isLoading={true} isError={false} hasFilter={false} />,
    );
    expect(screen.getByText("Personel listesi yükleniyor…")).toBeInTheDocument();

    rerender(
      <PersonnelTable
        rows={undefined}
        isLoading={false}
        isError={true}
        errorMessage="Sunucu hatası."
        hasFilter={false}
      />,
    );
    expect(screen.getByText("Sunucu hatası.")).toBeInTheDocument();
  });
});
