import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("cocuklari bir button rolunde render eder", () => {
    render(<Button>Kaydet</Button>);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument();
  });

  it("varsayilan olarak primary+md siniflarini uygular", () => {
    render(<Button>X</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--primary");
    expect(btn.className).toContain("btn--md");
  });

  it("variant ve size prop'larini sinifa cevirir", () => {
    render(
      <Button variant="danger" size="lg">
        Sil
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--danger");
    expect(btn.className).toContain("btn--lg");
  });

  it("onClick'i tetikler ve disabled iken tetiklemez", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Tikla</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Tikla
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disaridan gelen className'i birlestirir", () => {
    render(<Button className="extra">X</Button>);
    expect(screen.getByRole("button").className).toContain("extra");
  });
});
