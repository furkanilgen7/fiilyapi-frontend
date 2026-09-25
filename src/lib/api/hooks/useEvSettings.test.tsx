import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { EvSettingsRead, EvSettingsSave } from "@/lib/api/models";
import { BackendError } from "@/lib/api/unwrap";

import { SITE_CONTRACT_DEFAULTS } from "./site-fixtures";
import {
  evSettingsQueryKey,
  useEvSettings,
  useEvSiteOptions,
  useSaveEvSettings,
} from "./useEvSettings";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SETTINGS: EvSettingsRead = {
  week_start_dow: 0,
  weekly_off_days: [6],
  standard_daily_hours: "9.00",
  tolerance_points: "2.00",
  pf_bands: {
    daily: { red_below: "0.950", green_from: "0.950", high_above: "1.050" },
    weekly: { red_below: "0.950", green_from: "1.000" },
  },
  holidays: [],
  composite_metrics: [],
  is_default: true,
  updated_at: null,
  updated_by: null,
};

const SAVE: EvSettingsSave = {
  week_start_dow: 4,
  weekly_off_days: [6],
  standard_daily_hours: "8",
  tolerance_points: "2.0",
  pf_bands: {
    daily: { red_below: "0.95", green_from: "0.95", high_above: "1.05" },
    weekly: { red_below: "0.95", green_from: "1.00" },
  },
  holidays: [{ date_from: "2026-07-15", date_to: "2026-07-15", note: "Demokrasi" }],
  composite_metrics: [],
};

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function freshClient() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEvSettings", () => {
  it("şantiye id BOŞKEN ağa çıkmaz (boş-id kapısı)", async () => {
    freshClient();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useEvSettings(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET /sites/{id}/earned-value/settings okur", async () => {
    freshClient();
    const fetchMock = vi.fn(async (input: Request) => (input.method === "GET" ? json(SETTINGS) : json({}, 405)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useEvSettings("s-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.standard_daily_hours).toBe("9.00");
    const request = fetchMock.mock.calls[0][0];
    expect(request.method).toBe("GET");
    expect(new URL(request.url).pathname).toBe("/api/backend/sites/s-1/earned-value/settings");
  });

  it("403 yanıtını BackendError olarak taşır (ekran AccessDenied'e dallanır)", async () => {
    freshClient();
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "Yetkisiz işlem" }, 403)));

    const { result } = renderHook(() => useEvSettings("s-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
    expect((result.current.error as BackendError).status).toBe(403);
  });
});

describe("useSaveEvSettings", () => {
  it("PUT gövdesini aynen gönderir ve yanıtı önbelleğe yazar", async () => {
    freshClient();
    const saved: EvSettingsRead = { ...SETTINGS, week_start_dow: 4, is_default: false };
    const fetchMock = vi.fn(async (input: Request) => (input.method === "PUT" ? json(saved) : json({}, 405)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSaveEvSettings("s-1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(SAVE);
    });

    const request = fetchMock.mock.calls[0][0];
    expect(request.method).toBe("PUT");
    expect(new URL(request.url).pathname).toBe("/api/backend/sites/s-1/earned-value/settings");
    expect(await request.json()).toEqual(SAVE);
    expect(client.getQueryData(evSettingsQueryKey("s-1"))).toEqual(saved);
  });

  it("409 (tamamlanmış şantiye) hatasını fırlatır, önbelleği ezmez", async () => {
    freshClient();
    client.setQueryData(evSettingsQueryKey("s-1"), SETTINGS);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({ detail: "Tamamlanmış şantiyenin planlama ayarları salt okunurdur" }, 409),
      ),
    );

    const { result } = renderHook(() => useSaveEvSettings("s-1"), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(SAVE)).rejects.toBeInstanceOf(BackendError);
    });
    expect(client.getQueryData(evSettingsQueryKey("s-1"))).toEqual(SETTINGS);
  });
});

const PROJECTS = {
  items: [
    { id: "p-1", name: "Güneşkent Konut" },
    { id: "p-2", name: "Çelik OSB Fabrika" },
  ],
  total: 2,
};

function siteCard(id: string, name: string, status: string) {
  return {
    ...SITE_CONTRACT_DEFAULTS,
    id,
    name,
    status,
    code: id,
    address: null,
    city: null,
    city_inherited: false,
    site_manager_name: null,
    start_date: null,
    end_date: null,
    delivery_date: null,
    remaining_days: null,
    section_count: 0,
    worker_count: 0,
    progress_pct: null,
  };
}

function sitesOf(items: unknown[]) {
  return { counts: { all: items.length, active: 0, on_hold: 0, completed: 0 }, items, totals: {} };
}

describe("useEvSiteOptions", () => {
  it("şantiyeleri proje başlıklı gruplar, tamamlananı işaretler (Ek:420 · F0-8)", async () => {
    freshClient();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request) => {
        const path = new URL(input.url).pathname;
        if (path === "/api/backend/projects") return json(PROJECTS);
        if (path === "/api/backend/projects/p-1/sites") {
          return json(
            sitesOf([
              siteCard("s-a", "A-Blok Şantiyesi", "active"),
              siteCard("s-b", "B-Blok Şantiyesi", "completed"),
            ]),
          );
        }
        if (path === "/api/backend/projects/p-2/sites") {
          return json(sitesOf([siteCard("s-c", "Çelik OSB Fabrika", "completed")]));
        }
        return json({ detail: "yok" }, 404);
      }),
    );

    const { result } = renderHook(() => useEvSiteOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toHaveLength(3));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.groups.map((g) => g.projectName)).toEqual([
      "Güneşkent Konut",
      "Çelik OSB Fabrika",
    ]);
    expect(result.current.options).toEqual([
      {
        siteId: "s-a",
        siteName: "A-Blok Şantiyesi",
        projectId: "p-1",
        projectName: "Güneşkent Konut",
        isCompleted: false,
      },
      {
        siteId: "s-b",
        siteName: "B-Blok Şantiyesi",
        projectId: "p-1",
        projectName: "Güneşkent Konut",
        isCompleted: true,
      },
      {
        siteId: "s-c",
        siteName: "Çelik OSB Fabrika",
        projectId: "p-2",
        projectName: "Çelik OSB Fabrika",
        isCompleted: true,
      },
    ]);
  });
});
