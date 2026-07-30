import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useUserOptions, userOptionLabel, USER_OPTIONS_QUERY_KEY, USER_OPTIONS_LIMIT } from "./useUserOptions";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

// Uygulamadaki QueryProvider ile ayni: retry: 1. 403'un yeniden DENENMEDIGI
// ancak bu ayarla anlamli bir iddiadir (retry:false ile test hicbir sey kanitlamaz).
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(items: unknown[]) {
  return { data: { items, total: items.length }, error: undefined, response: new Response(null, { status: 200 }) };
}

function errorResponse(status: number) {
  return {
    data: undefined,
    error: { detail: "hata" },
    response: new Response(null, { status }),
  };
}

const USERS = [
  {
    id: "u-1",
    email: "sercan@example.com",
    full_name: "Sercan Öztürk",
    title: "Şantiye Şefi",
    role_id: "r-1",
    status: "active",
    last_login_at: null,
  },
  {
    id: "u-2",
    email: "ayse@example.com",
    full_name: "Ayşe Demir",
    title: null,
    role_id: "r-2",
    status: "on_leave",
    last_login_at: null,
  },
];

describe("useUserOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /users'i tek istekle limit=200 ile cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(USERS) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(USER_OPTIONS_LIMIT).toBe(200);
    expect(backendClient.GET).toHaveBeenCalledTimes(1);
    expect(backendClient.GET).toHaveBeenCalledWith("/users", {
      params: { query: { limit: 200, offset: 0 } },
    });
  });

  it("yaniti {id, full_name, title} listesine indirger", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(USERS) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.options).toEqual([
      { id: "u-1", full_name: "Sercan Öztürk", title: "Şantiye Şefi" },
      { id: "u-2", full_name: "Ayşe Demir", title: null },
    ]);
  });

  it("izinli (on_leave) personeli de listeler — atama backend'de serbesttir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(USERS) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.options.map((o) => o.id)).toContain("u-2");
  });

  it("hata durumunda error doner, veri uydurmaz", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(500) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.options).toEqual([]);
  });

  it("403'te isForbidden true doner ve secenek listesi bostur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isForbidden).toBe(true);
    expect(result.current.options).toEqual([]);
  });

  it("500'de isForbidden false doner", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(500) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isForbidden).toBe(false);
  });

  it("403'te sorgu yeniden denenmez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledTimes(1);
  });

  it("500'de yeniden dener (403 ozel durumdur, tum hatalar degil)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(500) as never);

    const { result } = renderHook(() => useUserOptions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledTimes(2);
  });

  it("USER_OPTIONS_QUERY_KEY tek onbellek anahtari kullanir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(USERS) as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function sharedWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    // Ayni ekranda ucu birden (sef, ISG, bolum sorumlusu) ayni sorguyu paylasir.
    const a = renderHook(() => useUserOptions(), { wrapper: sharedWrapper });
    const b = renderHook(() => useUserOptions(), { wrapper: sharedWrapper });
    const c = renderHook(() => useUserOptions(), { wrapper: sharedWrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(c.result.current.isSuccess).toBe(true));

    expect(backendClient.GET).toHaveBeenCalledTimes(1);
    expect(USER_OPTIONS_QUERY_KEY).toEqual(["user-options"]);
  });
});

describe("userOptionLabel", () => {
  it("title doluysa 'Ad (Unvan)' doner", () => {
    expect(userOptionLabel({ id: "u-1", full_name: "Sercan Öztürk", title: "Şantiye Şefi" })).toBe(
      "Sercan Öztürk (Şantiye Şefi)",
    );
  });

  it("title bossa yalniz 'Ad' doner", () => {
    expect(userOptionLabel({ id: "u-2", full_name: "Ayşe Demir", title: null })).toBe("Ayşe Demir");
  });

  it("title bosluktan ibaretse parantez basmaz", () => {
    expect(userOptionLabel({ id: "u-3", full_name: "Mehmet Kaya", title: "   " })).toBe("Mehmet Kaya");
  });
});
