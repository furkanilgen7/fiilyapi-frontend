import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectTabs } from "./ProjectTabs";

const counts = { all: 8, taahhut: 4, kendi_yatirim: 2, kat_karsiligi: 2, completed: 2, draft: 0 };

describe("ProjectTabs", () => {
  it("sayaclari basar ve aktif sekmeyi isaretler", () => {
    render(<ProjectTabs active="taahhut" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Tümü (8)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taahhüt (4)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tamamlanan (2)" })).toHaveAttribute("aria-selected", "false");
  });

  it("tiklanan sekmeyi bildirir", () => {
    const onChange = vi.fn();
    render(<ProjectTabs active="all" counts={counts} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Kat Karşılığı (2)" }));
    expect(onChange).toHaveBeenCalledWith("kat_karsiligi");
  });
});
