import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("LoginForm", () => {
  it("bos alanlarda dogrulama hatasi gosterir, istek atmaz", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    expect(await screen.findByText(/e-posta gerekli/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("basarili girisde / adresine yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/e-posta/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/^şifre$/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("401'de kimlik hatasi mesaji gosterir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/e-posta/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/^şifre$/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    expect(await screen.findByText(/e-posta veya şifre hatalı/i)).toBeInTheDocument();
  });

  it("parola goster/gizle calisir", async () => {
    render(<LoginForm />);
    const pw = screen.getByLabelText(/^şifre$/i) as HTMLInputElement;
    expect(pw.type).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: /şifreyi göster/i }));
    expect(pw.type).toBe("text");
  });
});
