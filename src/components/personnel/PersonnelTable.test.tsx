import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EMPTY_PERSONNEL_HR_FIELDS } from "@/lib/api/hooks/personnel-fixtures";

import { PersonnelTable } from "./PersonnelTable";
import type { PersonnelDeriveItem } from "./personnel-derive";

function row(overrides: Partial<PersonnelDeriveItem> = {}): PersonnelDeriveItem {
  return {
    ...EMPTY_PERSONNEL_HR_FIELDS,
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

  it("Proje/SGK/Ücret-Gün sütunları GERÇEK değer basar (İK-1 alanları)", () => {
    render(
      <PersonnelTable
        rows={[
          row({
            sgk_no: "1234567890",
            wage_type: "daily",
            wage_amount: "1450.00",
            assigned_project_id: "p-1",
          }),
        ]}
        isLoading={false}
        isError={false}
        hasFilter={false}
        projectNames={{ "p-1": "Kule A" }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Proje" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SGK" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ücret/Gün" })).toBeInTheDocument();

    expect(screen.getByTestId("personel-project-per-1")).toHaveTextContent("Kule A");
    expect(screen.getByTestId("personel-sgk-per-1")).toHaveTextContent("1234567890");
    // `daily` ⇒ sade tutar (birim eki YOK).
    expect(screen.getByTestId("personel-wage-per-1")).toHaveTextContent("₺ 1.450");
    expect(screen.getByTestId("personel-wage-per-1")).not.toHaveTextContent("/");
  });

  it("aylık/saatlik ücret YANILTMADAN birim ekiyle basılır (şef kararı)", () => {
    render(
      <PersonnelTable
        rows={[
          row({ id: "1", wage_type: "monthly", wage_amount: "42000.00" }),
          row({ id: "2", wage_type: "hourly", wage_amount: "185.50" }),
        ]}
        isLoading={false}
        isError={false}
        hasFilter={false}
        projectNames={{}}
      />,
    );
    expect(screen.getByTestId("personel-wage-1")).toHaveTextContent("₺ 42.000 / Ay");
    expect(screen.getByTestId("personel-wage-2")).toHaveTextContent("₺ 185,5 / Saat");
  });

  it("değer yoksa sade '—' basılır: proje atanmamış · SGK/ücret girilmemiş", () => {
    render(
      <PersonnelTable
        rows={[row()]}
        isLoading={false}
        isError={false}
        hasFilter={false}
        projectNames={{}}
      />,
    );
    const projectCell = screen.getByTestId("personel-project-per-1");
    expect(projectCell).toHaveTextContent("—");
    // "Atanmamış" GERÇEK bir boşluktur — pending gerekçesi TAŞIMAZ.
    expect(projectCell).not.toHaveAttribute("title");
    expect(screen.getByTestId("personel-sgk-per-1")).toHaveTextContent("—");
    expect(screen.getByTestId("personel-wage-per-1")).toHaveTextContent("—");
  });

  it("proje listesi yüklenemezse proje hücresi pending gerekçesine düşer", () => {
    render(
      <PersonnelTable
        rows={[row({ assigned_project_id: "p-1" })]}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    const projectCell = screen.getByTestId("personel-project-per-1");
    expect(projectCell).toHaveTextContent("—");
    expect(projectCell).toHaveAttribute("title", expect.stringContaining("Proje adları yüklenemedi"));
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

  // spec K2 · İK-3 dalı `WorkerSource` enum'una `freelance`/`intern` ekliyor;
  // değerler şemada HENÜZ YOK. Fikstür telden gelen gövdeyi taklit eder: JSON
  // çözümlemesi tip TAŞIMAZ — `as any`/`@ts-ignore` KULLANILMAZ.
  function rowWithWireSource(source: string): PersonnelDeriveItem {
    const wire: PersonnelDeriveItem = JSON.parse(JSON.stringify({ ...row(), source }));
    return wire;
  }

  it("gelecek `source` değerleri hazır etiketle basılır (Serbest/Stajyer)", () => {
    render(
      <PersonnelTable
        rows={[
          { ...rowWithWireSource("freelance"), id: "1" },
          { ...rowWithWireSource("intern"), id: "2" },
        ]}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    expect(screen.getByText("Serbest")).toBeInTheDocument();
    expect(screen.getByText("Stajyer")).toBeInTheDocument();
  });

  it("TANINMAYAN `source` ekranı ÇÖKERTMEZ: satır basılır, tür '—' olur", () => {
    render(
      <PersonnelTable
        rows={[rowWithWireSource("android")]}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    expect(screen.getByText("Mehmet Kılıç")).toBeInTheDocument();
    const cells = within(screen.getByTestId("personel-row-per-1")).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("—"); // Tür sütunu
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
