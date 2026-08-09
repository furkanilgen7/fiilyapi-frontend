import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FileInput } from "./FileInput";
import { Field } from "@/components/ui/field/Field";

// F-BC T3 · dosya secimi primitive'i. Ham `<input type="file">` ekranlara
// yazilmaz (form kontrolleri primitive kurali); tema disi kontrol birakilmaz.

describe("FileInput", () => {
  it("dosya turunde bir kontrol basar ve `accept` degerini gecirir", () => {
    render(<FileInput aria-label="Dosya" accept=".pdf" />);
    const control = screen.getByLabelText("Dosya");
    expect(control).toHaveAttribute("type", "file");
    expect(control).toHaveAttribute("accept", ".pdf");
    expect(control).toHaveClass("file-input");
  });

  it("Field render prop'undan gelen baglama props'larini kabul eder", () => {
    render(
      <Field label="Dosya" required>
        {(control) => <FileInput {...control} />}
      </Field>,
    );
    const control = screen.getByLabelText("Dosya");
    expect(control).toHaveAttribute("type", "file");
    expect(control).toHaveAttribute("aria-required", "true");
  });

  it("hata durumunda ayirt edici sinif tasir", () => {
    render(<FileInput aria-label="Dosya" status="error" />);
    expect(screen.getByLabelText("Dosya")).toHaveClass("file-input--error");
  });

  it("secilen dosyayi onChange ile bildirir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FileInput aria-label="Dosya" onChange={onChange} />);

    await user.upload(
      screen.getByLabelText("Dosya"),
      new File(["icerik"], "plan.pdf", { type: "application/pdf" }),
    );

    expect(onChange).toHaveBeenCalled();
    expect((screen.getByLabelText("Dosya") as HTMLInputElement).files?.[0].name).toBe("plan.pdf");
  });
});
