import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("uygulama adını bir başlık olarak gösterir", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "FİİL Yapı ERP" }),
    ).toBeInTheDocument();
  });
});
