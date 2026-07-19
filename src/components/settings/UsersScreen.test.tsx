import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersScreen } from "./UsersScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push }),
  usePathname: () => "/ayarlar/kullanicilar",
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UsersScreen", () => {
  it("kullanicilari rol adi ve durum ile listeler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/backend/roles")) {
          return new Response(
            JSON.stringify([{ id: "r1", key: "patron", name: "Patron", emoji: "", description: "", is_system: true }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            items: [{ id: "u1", email: "a@b.com", full_name: "Ali Veli", title: "Muhendis", role_id: "r1", status: "active" }],
            total: 1,
            limit: 20,
            offset: 0,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    renderScreen();
    expect(await screen.findByText("Ali Veli")).toBeInTheDocument();
    expect(screen.getByText("Patron")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });
});
