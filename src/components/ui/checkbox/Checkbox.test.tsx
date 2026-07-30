import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "./Checkbox";
import { Radio } from "./Radio";

describe("Checkbox", () => {
  it("label ile iliskili bir checkbox render eder", () => {
    render(<Checkbox label="Kabul" />);
    expect(screen.getByRole("checkbox", { name: "Kabul" })).toBeInTheDocument();
  });
  it("tiklaninca onChange tetiklenir", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Kabul" onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Kabul" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("disabled iken devre disidir", () => {
    render(<Checkbox label="Kabul" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  // T2 — alt eylem şeridi kutucuğu (şantiye mockup satır 221: 15×15)
  it("size verilmezse md kalir", () => {
    render(<Checkbox label="Kabul" />);
    expect(screen.getByRole("checkbox").className).not.toContain("checkbox--lg");
  });

  it("size=lg ui-checkbox--lg sinifini ekler", () => {
    render(<Checkbox label="Kabul" size="lg" />);
    expect(screen.getByRole("checkbox").className).toContain("checkbox--lg");
  });

  it("size prop'u DOM'un size ozniteligine sizmaz", () => {
    render(<Checkbox label="Kabul" size="lg" />);
    expect(screen.getByRole("checkbox")).not.toHaveAttribute("size");
  });
});

describe("Radio", () => {
  it("label ile iliskili bir radio render eder", () => {
    render(<Radio name="g" label="Secenek A" />);
    expect(screen.getByRole("radio", { name: "Secenek A" })).toBeInTheDocument();
  });
});
