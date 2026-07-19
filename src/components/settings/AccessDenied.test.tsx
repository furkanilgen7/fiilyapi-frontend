import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessDenied } from "./AccessDenied";
import { UsersScreen } from "./UsersScreen";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/ayarlar/kullanicilar",
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AccessDenied", () => {
  it("dostca yetki mesaji gosterir", () => {
    render(<AccessDenied />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("UsersScreen ilk fetch 403 donerse AccessDenied gosterir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "yasak" }), { status: 403 })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <UsersScreen />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});
