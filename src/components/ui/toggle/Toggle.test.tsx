import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("bir switch render eder", () => {
    render(<Toggle label="Bildirimler" />);
    expect(screen.getByRole("switch", { name: "Bildirimler" })).toBeInTheDocument();
  });
  it("tiklaninca onChange tetiklenir", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Bildirimler" onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("disabled iken devre disidir", () => {
    render(<Toggle label="Bildirimler" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
