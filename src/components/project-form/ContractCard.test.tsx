import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ContractCard, emptyContractValues, type ContractValues } from "./ContractCard";

function values(patch: Partial<ContractValues> = {}): ContractValues {
  return { ...emptyContractValues(), ...patch };
}

describe("ContractCard (F8)", () => {
  it("sözleşme alanları Field ile bağlı label taşır", () => {
    render(<ContractCard values={values()} onChange={() => {}} />);
    expect(screen.getByLabelText("Sözleşme No")).toBeInTheDocument();
    expect(screen.getByLabelText("İmza Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Sözleşme Bedeli (₺)")).toBeInTheDocument();
    expect(screen.getByLabelText("Başlangıç Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Bitiş Tarihi")).toBeInTheDocument();
  });

  it("Süre (Gün) readOnly ve tarihlerden hesaplanır (uç-dahil)", () => {
    render(
      <ContractCard
        values={values({ startDate: "2025-03-01", endDate: "2025-03-10" })}
        onChange={() => {}}
      />,
    );
    const duration = screen.getByLabelText("Süre (Gün)") as HTMLInputElement;
    expect(duration).toHaveAttribute("readonly");
    expect(duration.value).toBe("10");
  });

  it("tarih yokken Süre boş kalır", () => {
    render(<ContractCard values={values()} onChange={() => {}} />);
    expect((screen.getByLabelText("Süre (Gün)") as HTMLInputElement).value).toBe("");
  });

  it("KDV açılırı 20 · 10 · 1 seçeneklerini taşır", () => {
    render(<ContractCard values={values()} onChange={() => {}} />);
    const vat = screen.getByLabelText("KDV Oranı (%)");
    const options = Array.from(vat.querySelectorAll("option")).map((o) => o.value);
    expect(options).toEqual(["20", "10", "1"]);
  });

  it("fiyat farkı açıkken endeks alanları görünür", () => {
    render(
      <ContractCard
        values={values({ hasPriceEscalation: true })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Endeks Tipi")).toBeInTheDocument();
    expect(screen.getByLabelText("Baz Endeks Değeri (D0)")).toBeInTheDocument();
  });

  it("fiyat farkı kapatılınca endeks alanları DOM'dan kaldırılır (§7.4)", () => {
    render(
      <ContractCard
        values={values({ hasPriceEscalation: false })}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Endeks Tipi")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Baz Endeks Değeri (D0)")).not.toBeInTheDocument();
  });

  it("kutucuk değişince onChange(hasPriceEscalation)", async () => {
    const onChange = vi.fn();
    render(
      <ContractCard
        values={values({ hasPriceEscalation: true })}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Fiyat farkı uygulanacak" }),
    );
    expect(onChange).toHaveBeenCalledWith("hasPriceEscalation", false);
  });
});
