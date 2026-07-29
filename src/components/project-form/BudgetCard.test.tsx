import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BudgetCard } from "./BudgetCard";
import type { BudgetValues } from "./BudgetCard";

const mockupValues: BudgetValues = {
  material: "8000000",
  labor: "6000000",
  subcontractor: "5000000",
  overhead: "2860000",
};

const empty: BudgetValues = {
  material: "",
  labor: "",
  subcontractor: "",
  overhead: "",
};

describe("BudgetCard (F10)", () => {
  it("dört bütçe kalemi Field ile bağlı label taşır", () => {
    render(<BudgetCard values={empty} onChange={() => {}} contractAmount={null} />);
    expect(screen.getByLabelText("Malzeme Bütçesi")).toBeInTheDocument();
    expect(screen.getByLabelText("İşçilik Bütçesi")).toBeInTheDocument();
    expect(screen.getByLabelText("Taşeron Bütçesi")).toBeInTheDocument();
    expect(screen.getByLabelText("Genel Gider")).toBeInTheDocument();
  });

  it("mockup örneği: kâr 540.000 / %2,4 ve pozitif (kâr) durumu", () => {
    render(
      <BudgetCard
        values={mockupValues}
        onChange={() => {}}
        contractAmount={22_400_000}
      />,
    );
    const box = screen.getByTestId("pf-margin");
    expect(within(box).getByText("Tahmini Kâr Marjı")).toBeInTheDocument();
    expect(within(box).getByText(/540\.000/)).toBeInTheDocument();
    expect(within(box).getByText("%2,4")).toBeInTheDocument();
    expect(box.className).not.toContain("pf-margin--loss");
  });

  it("negatif kâr: 'Tahmini Zarar' + zarar sınıfı", () => {
    render(
      <BudgetCard
        values={mockupValues}
        onChange={() => {}}
        contractAmount={20_000_000}
      />,
    );
    const box = screen.getByTestId("pf-margin");
    expect(within(box).getByText("Tahmini Zarar")).toBeInTheDocument();
    expect(box.className).toContain("pf-margin--loss");
  });

  it("contractAmount 0/null → tutar '—', yüzde satırı yok (sahte %0 yok)", () => {
    render(
      <BudgetCard values={mockupValues} onChange={() => {}} contractAmount={null} />,
    );
    const box = screen.getByTestId("pf-margin");
    expect(within(box).getByText("—")).toBeInTheDocument();
    expect(within(box).queryByText(/%/)).not.toBeInTheDocument();
  });

  it("kalem değişince onChange(field, value)", async () => {
    const onChange = vi.fn();
    render(<BudgetCard values={empty} onChange={onChange} contractAmount={null} />);
    await userEvent.type(screen.getByLabelText("Malzeme Bütçesi"), "5");
    expect(onChange).toHaveBeenCalledWith("material", "5");
  });
});
