import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  InvestmentFields,
  LandShareFields,
  emptyInvestmentValues,
  emptyLandShareValues,
  emptyShareholderRow,
} from "./TypeFieldGroups";

describe("InvestmentFields (F8, kendi_yatirim)", () => {
  it("Satış Hedefi ve Arsa Maliyeti alanlarını gösterir", () => {
    render(
      <InvestmentFields values={emptyInvestmentValues()} onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Satış Hedefi (₺)")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Maliyeti (₺)")).toBeInTheDocument();
  });

  it("alan değişince onChange(field, value)", async () => {
    const onChange = vi.fn();
    render(
      <InvestmentFields values={emptyInvestmentValues()} onChange={onChange} />,
    );
    await userEvent.type(screen.getByLabelText("Satış Hedefi (₺)"), "5");
    expect(onChange).toHaveBeenCalledWith("salesTarget", "5");
  });
});

describe("LandShareFields (F8, kat_karsiligi)", () => {
  it("§7.3'te sıralanan alanları gösterir", () => {
    render(<LandShareFields values={emptyLandShareValues()} onChange={() => {}} />);
    expect(screen.getByLabelText("Arsa Sahibi")).toBeInTheDocument();
    expect(screen.getByLabelText("Müteahhit Payı (%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Sahibi Payı (%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Noter Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Teslim Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Günlük Ceza (₺/gün)")).toBeInTheDocument();
    expect(screen.getByLabelText("Teminat (₺)")).toBeInTheDocument();
  });

  it("hissedar ekle/sil çalışır", async () => {
    const onChange = vi.fn();
    render(
      <LandShareFields
        values={{ ...emptyLandShareValues(), shareholders: [emptyShareholderRow()] }}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "+ Hissedar Ekle" }));
    // id'ler kararlı-benzersiz üretilir (react-reviewer: index key yerine); içerik
    // karşılaştırması id'yi hariç tutar.
    expect(onChange).toHaveBeenCalledTimes(1);
    const [, shareholders] = onChange.mock.calls[0] as [string, { id: string; name: string; sharePct: string }[]];
    expect(shareholders).toHaveLength(2);
    expect(shareholders[0]).toMatchObject({ name: "", sharePct: "" });
    expect(shareholders[1]).toMatchObject({ name: "", sharePct: "" });
    expect(shareholders[0].id).not.toBe(shareholders[1].id);

    onChange.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: "Hissedar satırını sil" }),
    );
    expect(onChange).toHaveBeenCalledWith("shareholders", []);
  });
});
