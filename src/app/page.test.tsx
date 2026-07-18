import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("HomePage (placeholder)", () => {
  it("me verisiyle kullanici adini gosterir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }), { status: 200 }),
    );
    render(<HomePage />);
    expect(await screen.findByText(/Ahmet Yılmaz/)).toBeInTheDocument();
  });

  it("cikis yapinca /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ full_name: "Ahmet", role_key: "patron", title: "Patron" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<HomePage />);
    await screen.findByText(/Ahmet/);
    await userEvent.click(screen.getByRole("button", { name: /çıkış yap/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("401'de /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    render(<HomePage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
