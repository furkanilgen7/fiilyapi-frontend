import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Segmented, type SegmentedOption } from "./Segmented";

// Panel.dc.html:604 — "4 hafta / 3 ay / Tümü"
const RANGE: ReadonlyArray<SegmentedOption<"4h" | "3a" | "all">> = [
  { value: "4h", label: "4 hafta" },
  { value: "3a", label: "3 ay" },
  { value: "all", label: "Tümü" },
];

describe("Segmented", () => {
  it("aria-label taşıyan bir grup içinde her seçeneği düğme olarak basar", () => {
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="4h" onChange={() => {}} />);
    const group = screen.getByRole("group", { name: "Zaman aralığı" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Tümü" })).toBeInTheDocument();
  });

  it("yalnız seçili düğme aria-pressed=true taşır", () => {
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="3a" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "3 ay" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "4 hafta" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Tümü" })).toHaveAttribute("aria-pressed", "false");
  });

  it("seçili olmayan seçeneğe tıklanınca onChange o değerle çağrılır", async () => {
    const onChange = vi.fn();
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="4h" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Tümü" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("zaten seçili seçeneğe tıklamak onChange çağırmaz (tek seçim, boşa düşmez)", async () => {
    const onChange = vi.fn();
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="4h" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "4 hafta" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("klavye: Tab ile odaklanıp Enter ve Space ile seçilir", async () => {
    const onChange = vi.fn();
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="4h" onChange={onChange} />);
    await userEvent.tab(); // 4 hafta
    await userEvent.tab(); // 3 ay
    expect(screen.getByRole("button", { name: "3 ay" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("3a");
    await userEvent.tab(); // Tümü
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("all");
  });

  it("disabled (tümü): her düğme devre dışı, seçim görünür kalır, tıklama yutulur", async () => {
    const onChange = vi.fn();
    render(
      <Segmented aria-label="Zaman aralığı" options={RANGE} value="3a" onChange={onChange} disabled />,
    );
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
    expect(screen.getByRole("group")).toHaveClass("segmented--disabled");
    expect(screen.getByRole("button", { name: "3 ay" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Tümü" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("seçenek bazında disabled yalnız o düğmeyi kapatır", async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        aria-label="Görünüm"
        options={[
          { value: "w", label: "Hafta" },
          { value: "m", label: "Ay", disabled: true },
        ]}
        value="w"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Hafta" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ay" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Ay" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("form içinde düğmeler formu göndermez (type=button)", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Segmented aria-label="Zaman aralığı" options={RANGE} value="4h" onChange={() => {}} />
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "3 ay" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("boyut ve fill varyant sınıflarını uygular", () => {
    const { rerender } = render(
      <Segmented aria-label="Dağılım" options={RANGE} value="4h" onChange={() => {}} />,
    );
    const group = screen.getByRole("group", { name: "Dağılım" });
    expect(group).toHaveClass("segmented", "segmented--md");
    rerender(
      <Segmented aria-label="Dağılım" options={RANGE} value="4h" onChange={() => {}} size="sm" fill />,
    );
    expect(group).toHaveClass("segmented--sm", "segmented--fill");
    expect(group).not.toHaveClass("segmented--md");
  });

  it("seçili düğme seçili sınıfını taşır (görsel durum aria ile aynı kaynaktan)", () => {
    render(<Segmented aria-label="Zaman aralığı" options={RANGE} value="all" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Tümü" })).toHaveClass("segmented__item--selected");
    expect(screen.getByRole("button", { name: "3 ay" })).not.toHaveClass("segmented__item--selected");
  });
});
