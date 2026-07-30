import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteFormActions } from "./SiteFormActions";
import { pendingModuleLabel } from "@/lib/pending-modules";

function noop() {}

describe("SiteFormActions — alt eylem şeridi (mockup 219–229)", () => {
  it("eylem seridi split varyantiyla basar", () => {
    const { container } = render(
      <SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />,
    );
    const strip = container.querySelector(".pf-actions");
    expect(strip).toHaveClass("pf-actions--split");
  });

  it("sagda ucu de vardir: Iptal · Taslak Kaydet · Santiyeyi Olustur", () => {
    render(<SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />);
    expect(screen.getByRole("button", { name: "İptal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Taslak Kaydet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Şantiyeyi Oluştur" })).toBeInTheDocument();
  });

  it("uc buton tek grupta, kutucuk gruptan disaridadir (space-between)", () => {
    const { container } = render(
      <SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />,
    );
    const group = container.querySelector(".pf-actions__group");
    expect(group?.querySelectorAll("button")).toHaveLength(3);
    expect(group?.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("poz dagilimi kutucugu disabled ve isaretsizdir", () => {
    render(<SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />);
    const box = screen.getByRole("checkbox", {
      name: "Oluşturduktan sonra poz dağılımı ekranına git",
    });
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
  });

  it("poz dagilimi kutucugu contracts pendingModuleLabel title'i tasir", () => {
    render(<SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />);
    const box = screen.getByRole("checkbox", {
      name: "Oluşturduktan sonra poz dağılımı ekranına git",
    });
    expect(box).toHaveAttribute("title", pendingModuleLabel("contracts"));
  });

  it("kutucuk lg olcu varyantini kullanir (mockup 221: 15x15)", () => {
    render(<SiteFormActions onCancel={noop} onSaveDraft={noop} onSubmit={noop} />);
    const box = screen.getByRole("checkbox", {
      name: "Oluşturduktan sonra poz dağılımı ekranına git",
    });
    expect(box).toHaveClass("checkbox--lg");
  });

  it("uc eylem de cagriciya baglanir", async () => {
    const onCancel = vi.fn();
    const onSaveDraft = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SiteFormActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
      />,
    );
    screen.getByRole("button", { name: "İptal" }).click();
    screen.getByRole("button", { name: "Taslak Kaydet" }).click();
    screen.getByRole("button", { name: "Şantiyeyi Oluştur" }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
