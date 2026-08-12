import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { WarehouseModal } from "./WarehouseModal";
import { useCreateWarehouse } from "@/lib/api/hooks/useStockMutations";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useStockMutations", () => ({ useCreateWarehouse: vi.fn() }));
vi.mock("@/lib/api/hooks/useProjects", () => ({ useProjects: vi.fn() }));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSites: vi.fn() }));

const mutate = vi.fn();
const onClose = vi.fn();

function queryStub(data: unknown) {
  return { data, isLoading: false, isError: false, error: null } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCreateWarehouse).mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateWarehouse>);
  vi.mocked(useProjects).mockReturnValue(
    queryStub({ items: [{ id: "p-1", name: "Güneşkent Konut" }] }),
  );
  vi.mocked(useSites).mockReturnValue(queryStub({ items: [{ id: "s-1", name: "A-Blok" }] }));
});

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
}

describe("WarehouseModal — S3 türetilmiş diyalog", () => {
  it("şantiye seçilmezse site_id gövdede HİÇ taşınmaz (= MERKEZ depo)", () => {
    render(<WarehouseModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Depo Adı/), {
      target: { value: "Merkez Depo (Sincan)" },
    });
    submit();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ name: "Merkez Depo (Sincan)" });
    expect(mutate.mock.calls[0][0]).not.toHaveProperty("site_id");
  });

  it("şantiye seçimi iki adımlıdır ve gövdeye site_id olarak gider", () => {
    render(<WarehouseModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Depo Adı/), { target: { value: "D-1 Ambar" } });
    // Şantiye alanı ancak proje seçilince açılır (liste ucu proje kapsamlıdır).
    expect(screen.queryByLabelText(/Şantiye/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Proje/), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText(/Şantiye/), { target: { value: "s-1" } });
    submit();

    expect(mutate.mock.calls[0][0]).toEqual({ name: "D-1 Ambar", site_id: "s-1" });
  });

  it("proje değişince şantiye seçimi DÜŞER (kimlik projeye aittir)", () => {
    render(<WarehouseModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Depo Adı/), { target: { value: "D-2" } });
    fireEvent.change(screen.getByLabelText(/Proje/), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText(/Şantiye/), { target: { value: "s-1" } });
    fireEvent.change(screen.getByLabelText(/Proje/), { target: { value: "" } });
    submit();

    expect(mutate.mock.calls[0][0]).toEqual({ name: "D-2" });
  });

  it("ad boşken ağa ÇIKILMAZ", () => {
    render(<WarehouseModal onClose={onClose} />);
    submit();
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Depo adı zorunludur.")).toBeInTheDocument();
  });

  it("404 varlık hatası Türkçe ve GÖRÜNÜR basılır (§4b kanonu)", () => {
    mutate.mockImplementation((_body, options) => {
      options.onError(new BackendError(404, { detail: "Şantiye bulunamadı." }));
    });
    render(<WarehouseModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Depo Adı/), { target: { value: "D-9" } });
    submit();

    expect(screen.getByText("Şantiye bulunamadı.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("başarıda diyalog kapanır", () => {
    mutate.mockImplementation((_body, options) => options.onSuccess());
    render(<WarehouseModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Depo Adı/), { target: { value: "D-3" } });
    submit();
    expect(onClose).toHaveBeenCalled();
  });
});
