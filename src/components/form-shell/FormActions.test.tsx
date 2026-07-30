import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormActions } from "./FormActions";

const noop = () => {};

function renderActions(props: Partial<React.ComponentProps<typeof FormActions>> = {}) {
  return render(
    <FormActions
      onCancel={noop}
      onSaveDraft={noop}
      onSubmit={noop}
      submitLabel="Projeyi Oluştur"
      {...props}
    />,
  );
}

describe("FormActions (paylaşılan alt eylem şeridi)", () => {
  it("varsayılan variant 'end' davranışını korur — split sınıfı basılmaz", () => {
    const { container } = renderActions();
    const bar = container.querySelector(".pf-actions");
    expect(bar).not.toBeNull();
    expect(bar).not.toHaveClass("pf-actions--split");
  });

  it("variant=split eylem şeridine split sınıfını ekler", () => {
    const { container } = renderActions({ variant: "split" });
    expect(container.querySelector(".pf-actions")).toHaveClass("pf-actions--split");
  });

  it("varsayılan variant butonları grup sarmalayıcısına almaz", () => {
    const { container } = renderActions();
    expect(container.querySelector(".pf-actions__group")).toBeNull();
  });

  it("variant=split butonları tek gruba alır (space-between'in sağ ucu)", () => {
    const { container } = renderActions({ variant: "split" });
    const group = container.querySelector(".pf-actions__group");
    expect(group?.querySelectorAll("button")).toHaveLength(3);
  });

  it("variant=split leading yuvasını grup dışında, solda basar", () => {
    const { container } = renderActions({
      variant: "split",
      leading: <span data-testid="leading-slot">sol</span>,
    });
    const strip = container.querySelector(".pf-actions") as HTMLElement;
    expect(strip.firstElementChild).toHaveAttribute("data-testid", "leading-slot");
    expect(
      container.querySelector(".pf-actions__group [data-testid='leading-slot']"),
    ).toBeNull();
  });

  it("submitLabel prop'unu birincil butona basar", () => {
    renderActions({ submitLabel: "Şantiyeyi Oluştur" });
    expect(
      screen.getByRole("button", { name: "Şantiyeyi Oluştur" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Projeyi Oluştur" })).toBeNull();
  });

  it("İptal ve Taslak Kaydet metinleri iki formda da ortaktır", () => {
    renderActions();
    expect(screen.getByRole("button", { name: "İptal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Taslak Kaydet" })).toBeInTheDocument();
  });

  it("üç butonu da ilgili geri çağrıya bağlar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSaveDraft = vi.fn();
    const onSubmit = vi.fn();
    renderActions({ onCancel, onSaveDraft, onSubmit });

    await user.click(screen.getByRole("button", { name: "İptal" }));
    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    await user.click(screen.getByRole("button", { name: "Projeyi Oluştur" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("isPending iken üç buton da devre dışıdır", () => {
    renderActions({ isPending: true });
    for (const name of ["İptal", "Taslak Kaydet", "Projeyi Oluştur"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });
});
