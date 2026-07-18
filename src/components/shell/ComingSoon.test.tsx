import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComingSoon from "./ComingSoon";

describe("ComingSoon", () => {
  it("modul adini ve yakinda mesajini gosterir", () => {
    render(<ComingSoon moduleName="Projeler" />);
    expect(screen.getByText("Projeler")).toBeInTheDocument();
    expect(screen.getByText(/yakında/i)).toBeInTheDocument();
  });
});
