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

  it("mali grubunda modulleri sort_order ile siralar (fatura yonetimi dahil)", async () => {
    // Matris veri-guduml: modul sayisi/sirasi tamamen /modules yanitindan gelir.
    const modules = [
      { id: "m-treasury", key: "treasury", name: "Hazine", group: "MALI", sort_order: 12 },
      { id: "m-accounting", key: "accounting", name: "Muhasebe", group: "MALI", sort_order: 10 },
      { id: "m-invoicing", key: "invoicing", name: "Fatura Yönetimi", group: "MALI", sort_order: 11 },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const json = (body: unknown) =>
          new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
        if (url.includes("/api/backend/modules")) return json(modules);
        if (url.includes("/permissions")) {
          return json(modules.map((m) => ({ module_key: m.key, access_level: "view", scope: "all" })));
        }
        if (url.includes("/api/backend/roles")) {
          return json([{ id: "r1", key: "accounting", name: "Muhasebe", emoji: "", description: "", is_system: false }]);
        }
        return json([]);
      }),
    );

    renderMatrix();
    expect(await screen.findByText("Fatura Yönetimi")).toBeInTheDocument();
    const rowHeaders = screen.getAllByRole("rowheader").map((el) => el.textContent);
    expect(rowHeaders).toEqual(["Muhasebe", "Fatura Yönetimi", "Hazine"]);
  });
});
