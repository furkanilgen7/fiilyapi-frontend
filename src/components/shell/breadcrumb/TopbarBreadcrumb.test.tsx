import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROJECT_QUERY_KEY } from "@/lib/api/hooks/useProjects";
import { SECTION_QUERY_KEY } from "@/lib/api/hooks/useSection";
import { SITE_QUERY_KEY } from "@/lib/api/hooks/useSites";

import { TopbarBreadcrumb } from "./TopbarBreadcrumb";

let currentPath = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

const PROJECT_KEY = "gunesken-konut";
const SITE_KEY = "a-blok";
const SECTION_KEY = "kaba-insaat";

/**
 * 🔴 B3'ün ÖLÇÜM ARACI. Kırıntı ad için ikinci bir istek atarsa bu casus onu
 * görür. `fetch`i mock'lamak DEĞİL, ÇAĞRILDIĞINI SAYMAK önemli: mock'lanmış
 * ama çağrılan bir fetch de "ikinci istek"tir.
 */
let fetchSpy: ReturnType<typeof vi.fn>;

function seededClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Sayfanın KENDİ sorgularının önbelleğe yazdığı hâl — anahtarlar
  // `useProject` / `useSite` / `useSection` ile BİREBİR aynıdır.
  client.setQueryData([PROJECT_QUERY_KEY, PROJECT_KEY], { name: "Güneşkent Konut" });
  client.setQueryData([SITE_QUERY_KEY, SITE_KEY, PROJECT_KEY], {
    name: "A-Blok",
    project: { name: "Güneşkent Konut" },
  });
  client.setQueryData([SECTION_QUERY_KEY, SECTION_KEY, SITE_KEY, PROJECT_KEY], {
    name: "Kaba İnşaat",
  });
  return client;
}

function renderAt(pathname: string, client: QueryClient = seededClient()) {
  currentPath = pathname;
  return render(
    <QueryClientProvider client={client}>
      <TopbarBreadcrumb />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new Error("kırıntı ağa ÇIKMAMALI")));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  currentPath = "/";
});

/* ─── B3 · ikinci istek yok ───────────────────────────────────────────── */

describe("ad çözümleme — yalnız önbellek", () => {
  it("adları basar ama HİÇBİR ağ isteği atmaz", async () => {
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}/gunluk-kayit`);

    const list = screen.getByTestId("topbar-crumbs");
    expect(within(list).getByText("Güneşkent Konut")).toBeInTheDocument();
    expect(within(list).getByText("A-Blok")).toBeInTheDocument();

    // Mutasyon: kırıntıyı kendi `useQuery`siyle (queryFn dolu) beslet → kırmızı.
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bölüm adı da yalnız önbellekten gelir", () => {
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}/bolumler/${SECTION_KEY}`);
    const list = screen.getByTestId("topbar-crumbs");
    // 🔴 Parça bazında: birleşik metin iddiası üç ad tek düğüme çökse de geçerdi.
    expect(within(list).getByText("Kaba İnşaat")).toBeInTheDocument();
    expect(within(list).getByText("A-Blok")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("şantiye alt ağacında proje adı ŞANTİYE yanıtından gelir (proje sorgusu YOK)", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData([SITE_QUERY_KEY, SITE_KEY, PROJECT_KEY], {
      name: "A-Blok",
      project: { name: "Güneşkent Konut" },
    });
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}/puantaj`, client);

    const list = screen.getByTestId("topbar-crumbs");
    expect(within(list).getByText("Güneşkent Konut")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POZİTİF KONTROL — önbellek BOŞken ham anahtar basılmaz, iskelet basılır", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}`, client);

    expect(screen.getAllByTestId("crumb-pending")).toHaveLength(2);
    const list = screen.getByTestId("topbar-crumbs");
    expect(list.textContent).not.toContain(PROJECT_KEY);
    expect(list.textContent).not.toContain(SITE_KEY);
    // Ekran okuyucu yine de nerede olduğunu duyar.
    expect(within(list).getByText("Şantiye")).toBeInTheDocument();
  });
});

/* ─── B5 · son parça bağlantı DEĞİL ───────────────────────────────────── */

describe("son parça", () => {
  it("bağlantı DEĞİLDİR; öncekilerin hepsi bağlantıdır", () => {
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}/gunluk-kayit`);
    const list = screen.getByTestId("topbar-crumbs");

    // 🔴 `getAllByRole("link")` KULLANILMAZ: açık `role` taşıyan bir `<a>`
    // (ör. `role="tab"`) o sorgudan KAÇAR ve bekçinin yarısı sessizce ölçmez.
    const anchors = [...list.querySelectorAll("a[href]")];
    expect(anchors.map((a) => a.textContent)).toEqual([
      "Projeler",
      "Güneşkent Konut",
      "A-Blok",
    ]);

    const current = within(list).getByText("Günlük Kayıt");
    expect(current.closest("a")).toBeNull();
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("tek parçalı kırıntıda hiç bağlantı yoktur", () => {
    renderAt("/");
    expect(screen.getByTestId("topbar-crumbs").querySelectorAll("a[href]")).toHaveLength(0);
  });
});

/* ─── B2 · geri tuşu ──────────────────────────────────────────────────── */

describe("geri tuşu", () => {
  it("bir seviye yukarıya giden GERÇEK bir bağlantıdır", () => {
    renderAt(`/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}/gunluk-kayit`);
    const back = screen.getByTestId("topbar-back");
    // Mutasyon: `router.back()` çağıran bir <button>a çevir → `href` kaybolur
    // ve bu iddia kırmızı olur.
    expect(back.tagName).toBe("A");
    expect(back).toHaveAttribute("href", `/projeler/${PROJECT_KEY}/santiyeler/${SITE_KEY}`);
    expect(back).toHaveAccessibleName("A-Blok sayfasına dön");
  });

  it("aynı yol iki ayrı render'da AYNI hedefi verir (geçmiş etkisi yok)", () => {
    const first = renderAt(`/projeler/${PROJECT_KEY}/ozet`);
    const target = first.getByTestId("topbar-back").getAttribute("href");
    first.unmount();
    const second = renderAt(`/projeler/${PROJECT_KEY}/ozet`);
    expect(second.getByTestId("topbar-back")).toHaveAttribute("href", target ?? "");
    expect(target).toBe(`/projeler/${PROJECT_KEY}`);
  });

  it("POZİTİF KONTROL — kökte ve modül kökünde geri tuşu BASILMAZ", () => {
    const atRoot = renderAt("/");
    expect(atRoot.queryByTestId("topbar-back")).toBeNull();
    atRoot.unmount();

    const atModule = renderAt("/puantaj");
    expect(atModule.queryByTestId("topbar-back")).toBeNull();
  });
});

/* ─── Kabuk bütünlüğü ─────────────────────────────────────────────────── */

describe("kırıntı kabuğu", () => {
  it("erişilebilir bir gezinme bölgesidir", () => {
    renderAt("/muhasebe/mizan");
    expect(screen.getByRole("navigation", { name: "Yol göstergesi" })).toBeInTheDocument();
    expect(screen.getByText("Mizan")).toHaveAttribute("aria-current", "page");
  });

  it("yazılmamış rotada tek parça basar, geri tuşu basmaz", () => {
    renderAt("/raporlar");
    expect(screen.getByText("Raporlar")).toBeInTheDocument();
    expect(screen.queryByTestId("topbar-back")).toBeNull();
  });
});
