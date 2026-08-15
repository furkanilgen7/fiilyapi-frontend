import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { BankAccountResponse } from "@/lib/api/hooks/useBankAccounts";

import { BankAccountCards } from "./BankAccountCards";

function account(overrides: Partial<BankAccountResponse> = {}): BankAccountResponse {
  return {
    id: "acc-1",
    bank_name: "Ziraat Bank",
    account_type: "checking",
    iban: "TR12 0001 0093 0012 3456 7890",
    display_name: null,
    opening_balance: "1000000.00",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    balance: "2840500.00",
    ...overrides,
  };
}

describe("BankAccountCards — E9:69-85", () => {
  it("E9:71 künye satırını '<banka> · <tür>' olarak kurar", () => {
    render(<BankAccountCards accounts={[account()]} />);
    expect(screen.getByText("Ziraat Bank · Vadesiz")).toBeInTheDocument();
  });

  it("E9:81 kasa hesabının tür etiketi 'Kasa'dır", () => {
    render(
      <BankAccountCards
        accounts={[
          account({
            id: "acc-3",
            bank_name: "Yapı Kredi",
            account_type: "cash",
            iban: null,
            display_name: "Merkez Kasa",
          }),
        ]}
      />,
    );
    expect(screen.getByText("Yapı Kredi · Kasa")).toBeInTheDocument();
    // E9:83 — IBAN'ı olmayan kasada görünen ad basılır.
    expect(screen.getByText("Merkez Kasa")).toBeInTheDocument();
  });

  it("🔴 E9:72 TÜRETİLMİŞ `balance`ı basar, `opening_balance`ı DEĞİL", () => {
    render(<BankAccountCards accounts={[account()]} />);
    expect(screen.getByText("₺ 2.840.500")).toBeInTheDocument();
    expect(screen.queryByText("₺ 1.000.000")).not.toBeInTheDocument();
  });

  it("IBAN da görünen ad da yoksa zarif düşüş + görünür ipucu basar", () => {
    render(<BankAccountCards accounts={[account({ iban: null, display_name: null })]} />);
    const line = screen.getByText("IBAN / açıklama girilmemiş");
    expect(line).toBeInTheDocument();
    expect(line.getAttribute("title")).toMatch(/eksik/);
  });

  it("degrade SIRAYA göre döner — iki `checking` kart FARKLI degrade alır", () => {
    // E9:71 ve E9:76 ikisi de "Vadesiz" ama E9:70/75 farklı degradeler.
    render(
      <BankAccountCards
        accounts={[
          account({ id: "a" }),
          account({ id: "b", bank_name: "İş Bank" }),
          account({ id: "c", bank_name: "Yapı Kredi", account_type: "cash" }),
          account({ id: "d", bank_name: "Garanti" }),
        ]}
      />,
    );
    const gradients = screen
      .getAllByTestId("hazine-account-card")
      .map((node) => node.style.background);
    expect(gradients).toEqual([
      "var(--gradient-treasury-card-1)",
      "var(--gradient-treasury-card-2)",
      "var(--gradient-treasury-card-3)",
      "var(--gradient-treasury-card-1)",
    ]);
    // Tip bazlı olsaydı ilk iki kart (ikisi de checking) AYNI olurdu.
    expect(gradients[0]).not.toBe(gradients[1]);
  });

  it("her karta ayırt edici veri özniteliği koyar", () => {
    render(<BankAccountCards accounts={[account({ id: "acc-42" })]} />);
    expect(screen.getByTestId("hazine-account-card").dataset.accountId).toBe("acc-42");
  });
});
