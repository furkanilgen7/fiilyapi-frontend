import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { markStaleBuild, resetStaleBuildForTests } from "@/lib/api/app-build";
import { StaleBuildBanner } from "./StaleBuildBanner";

afterEach(() => {
  resetStaleBuildForTests();
});

describe("StaleBuildBanner (PLN-F2.0 surum bandi)", () => {
  it("surumler uyumluyken HICBIR sey basmaz (mevcut kareler degismez)", () => {
    const { container } = render(<StaleBuildBanner />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("eski surum durumu kurulunca uyari bandini ve Yenile dugmesini basar", () => {
    render(<StaleBuildBanner />);
    act(() => markStaleBuild());

    const band = screen.getByRole("alert");
    expect(band).toHaveTextContent("Uygulama güncellendi — kaydetmeden önce sayfayı yenileyin.");
    // Emsal: `@/components/ui` Alert'in uyari varyanti (PayrollSgkView bantlari).
    expect(band.className).toContain("alert--warning");
    expect(screen.getByRole("button", { name: "Yenile" })).toBeInTheDocument();
  });

  it("Yenile dugmesi sayfayi yeniler", async () => {
    const reload = vi.fn();
    render(<StaleBuildBanner onReload={reload} />);
    act(() => markStaleBuild());

    await userEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("durum bant acilmadan ONCE kurulduysa da ilk render'da gorunur", () => {
    markStaleBuild();
    render(<StaleBuildBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
