import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Field } from "../field";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("Field ile baglanmis <label> uretir (getByLabelText eslesir)", () => {
    render(
      <Field label="Açık Adres">
        {(control) => <Textarea {...control} rows={2} />}
      </Field>,
    );
    const control = screen.getByLabelText("Açık Adres");
    expect(control.tagName).toBe("TEXTAREA");
    expect(control).toHaveAttribute("rows", "2");
  });

  it("yazmaya izin verir", async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="not" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("not"), "abc");
    expect(onChange).toHaveBeenCalled();
  });

  it("disabled iken devre disidir", () => {
    render(<Textarea aria-label="not" disabled />);
    expect(screen.getByLabelText("not")).toBeDisabled();
  });
});
