import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CardEmptyState } from "./CardEmptyState";

describe("CardEmptyState", () => {
  it("baslik ve modul metnini basar", () => {
    render(<CardEmptyState title="Henüz hakediş verisi yok" pendingModule="progress_payments" />);
    expect(screen.getByText("Henüz hakediş verisi yok")).toBeInTheDocument();
    expect(screen.getByText("Hakediş verisi bu yüzeye henüz bağlanmadı")).toBeInTheDocument();
  });

  it("bilinmeyen modul anahtarinda genel metin basar", () => {
    render(<CardEmptyState title="Uyarı yok" pendingModule="bilinmeyen" />);
    expect(screen.getByText("İlgili modülle birlikte gelir")).toBeInTheDocument();
  });

  it("fatura modulunu esler", () => {
    render(<CardEmptyState title="Henüz fatura verisi yok" pendingModule="invoicing" />);
    expect(screen.getByText("Fatura verisi bu yüzeye henüz bağlanmadı")).toBeInTheDocument();
  });
});
