import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ErrorCard } from "./ErrorCard";

// Planlama - Panel.dc.html:427-429
const TITLE = "Panel verisi alınamadı";
const DESC = "Hesaplama servisi yanıt vermedi. Girilen veriler kaybolmadı.";

describe("ErrorCard", () => {
  it("alert rolünde başlık ve açıklamayı basar", () => {
    render(<ErrorCard title={TITLE} description={DESC} onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(TITLE);
    expect(alert).toHaveTextContent(DESC);
  });

  it("'Tekrar dene' düğmesi onRetry'ı bir kez çağırır", async () => {
    const onRetry = vi.fn();
    render(<ErrorCard title={TITLE} description={DESC} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("retrying iken düğme devre dışı ve tıklama onRetry'a ulaşmaz", async () => {
    const onRetry = vi.fn();
    render(<ErrorCard title={TITLE} description={DESC} onRetry={onRetry} retrying />);
    const button = screen.getByRole("button", { name: "Tekrar dene" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("açıklama isteğe bağlıdır", () => {
    render(<ErrorCard title="Katalog yüklenemedi" onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Katalog yüklenemedi");
    expect(screen.getByRole("alert").querySelector(".ev-error-card__description")).toBeNull();
  });

  it("düğme ui/button primitive'inden gelir ve form göndermez", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ErrorCard title={TITLE} onRetry={() => {}} />
      </form>,
    );
    const button = screen.getByRole("button", { name: "Tekrar dene" });
    expect(button).toHaveClass("btn");
    await userEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
