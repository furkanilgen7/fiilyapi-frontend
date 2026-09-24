import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChipToggleGroup } from "./ChipToggleGroup";

const DAYS = [
  { value: 0, label: "Pzt" },
  { value: 5, label: "Cmt" },
  { value: 6, label: "Paz" },
];

describe("ChipToggleGroup", () => {
  it("adlandırılmış grup içinde seçimi aria-pressed ile bildirir", () => {
    render(
      <ChipToggleGroup
        aria-label="Çalışılmayan haftalık günler"
        options={DAYS}
        value={[6]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "Çalışılmayan haftalık günler" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paz" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pzt" })).toHaveAttribute("aria-pressed", "false");
  });

  it("çoklu modda tıklanan değeri ekler ya da çıkarır", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChipToggleGroup aria-label="Günler" options={DAYS} value={[6]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cmt" }));
    expect(onChange).toHaveBeenLastCalledWith([6, 5]);

    await user.click(screen.getByRole("button", { name: "Paz" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("tekli modda seçimi değiştirir, seçili olana tıklamak boşa düşürmez", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipToggleGroup
        aria-label="Payda"
        multiple={false}
        options={DAYS}
        value={[6]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pzt" }));
    expect(onChange).toHaveBeenLastCalledWith([0]);

    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Paz" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("kapalıyken hiçbir düğme tıklanamaz", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipToggleGroup aria-label="Günler" options={DAYS} value={[]} onChange={onChange} disabled />,
    );
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Pzt" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
