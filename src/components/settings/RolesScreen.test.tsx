import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RolesScreen } from "./RolesScreen";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RolesScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RolesScreen", () => {
  it("rolleri listeler ve is_system rolun sil butonu devre disidir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { id: "r1", key: "system_admin", name: "Sistem Yöneticisi", emoji: "🛡️", description: "Tam yetki", is_system: true },
            { id: "r2", key: "saha", name: "Saha", emoji: "👷", description: "Saha ekibi", is_system: false },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    renderScreen();
    expect(await screen.findByText("Sistem Yöneticisi")).toBeInTheDocument();
    expect(screen.getByText("Saha")).toBeInTheDocument();

    // system rol satirindaki Sil butonu disabled
    const sistemRow = screen.getByText("Sistem Yöneticisi").closest("tr");
    expect(sistemRow).not.toBeNull();
    const sistemDelete = sistemRow!.querySelector("button[data-action='delete']") as HTMLButtonElement;
    expect(sistemDelete).toBeDisabled();
  });
});
