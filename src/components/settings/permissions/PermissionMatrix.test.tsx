import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrix } from "./PermissionMatrix";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), refresh: vi.fn() }),
}));

function renderMatrix() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PermissionMatrix />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PermissionMatrix", () => {
  it("grup basligi + modul satiri + rol sutunu render eder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/backend/modules")) {
          return new Response(
            JSON.stringify([{ id: "m1", key: "raporlar", name: "Raporlar", group: "GENEL", sort_order: 1 }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        // /roles/r1/permissions — spesifik yol kontrolu, genel "/roles"
        // kontrolunden ONCE gelmeli (aksi halde substring eslesmesi bu istegi
        // yanlislikla rol listesi dalina dusurur ve hucreler hep bos kalir).
        if (url.includes("/permissions")) {
          return new Response(JSON.stringify([{ module_key: "raporlar", access_level: "view", scope: "all" }]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.includes("/api/backend/roles")) {
          return new Response(
            JSON.stringify([{ id: "r1", key: "saha", name: "Saha", emoji: "", description: "", is_system: false }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      }),
    );

    renderMatrix();
    expect(await screen.findByText("Genel")).toBeInTheDocument();
    expect(screen.getByText("Raporlar")).toBeInTheDocument();
    expect(screen.getByText("Saha")).toBeInTheDocument();
    // hucre secimi mevcut preset'i ("Görüntüle") gosterir
    expect(await screen.findByDisplayValue("Görüntüle")).toBeInTheDocument();
    // lejant erisim duzeyi acikamalarini gosterir
    expect(screen.getByText("Erişim düzeyleri")).toBeInTheDocument();
    expect(screen.getByText("Modülde her şey: oluştur, düzenle ve sil. En üst yetki.")).toBeInTheDocument();
  });
});
