import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectTypeCards } from "./ProjectTypeCards";

describe("ProjectTypeCards (F6)", () => {
  it("gerçek radiogroup: üç radio, erişilebilir adı 'Proje Tipi'", () => {
    render(<ProjectTypeCards value="taahhut" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Proje Tipi" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("varsayılan taahhut seçili", () => {
    render(<ProjectTypeCards value="taahhut" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /Taahhüt/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Kendi Yatırım/ })).not.toBeChecked();
  });

  it("başka tip seçilince onChange doğru değeri verir", async () => {
    const onChange = vi.fn();
    render(<ProjectTypeCards value="taahhut" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /Kat Karşılığı/ }));
    expect(onChange).toHaveBeenCalledWith("kat_karsiligi");
  });

  it("radyolar tek bir grup adını paylaşır (native ok-tuşu gezinmesi)", () => {
    render(<ProjectTypeCards value="taahhut" onChange={() => {}} />);
    const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
    expect(new Set(names).size).toBe(1);
  });
});
