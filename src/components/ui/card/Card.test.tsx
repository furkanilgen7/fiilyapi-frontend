import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("govdeyi render eder", () => {
    render(<Card>Icerik</Card>);
    expect(screen.getByText("Icerik")).toBeInTheDocument();
  });
  it("baslik ve aksiyonlari render eder", () => {
    render(
      <Card title="Baslik" actions={<button>Aksiyon</button>}>
        Icerik
      </Card>,
    );
    expect(screen.getByText("Baslik")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksiyon" })).toBeInTheDocument();
  });
});
