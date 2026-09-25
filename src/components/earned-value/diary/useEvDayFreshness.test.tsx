import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EV_DAY_KEYS } from "@/lib/api/hooks/useEvDay";
import { SITE_DIARY_ENTRY_QUERY_KEY } from "@/lib/api/hooks/useSiteDiary";

import { useEvDayFreshness } from "./useEvDayFreshness";

// PLN-F2.3 · çekirdek kaydından sonra gün görünümü (kontrol listesi, PF) tazelenir.
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData([EV_DAY_KEYS.day, "s-1", "2026-09-24"], { day: "2026-09-24" });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const isStale = () => client.getQueryState([EV_DAY_KEYS.day, "s-1", "2026-09-24"])?.isInvalidated === true;
  return { client, wrapper, isStale };
}

describe("useEvDayFreshness", () => {
  it("kaydın İLK yüklemesi tazelemez; kayıt sonrası yeniden çekilişi tazeler", async () => {
    const { client, wrapper, isStale } = setup();
    renderHook(() => useEvDayFreshness("s-1", "2026-09-24", "d-1", "draft"), { wrapper });
    await act(() => client.fetchQuery({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY, "d-1"], queryFn: async () => ({ v: 1 }) }));
    expect(isStale()).toBe(false);
    await act(() => client.refetchQueries({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY, "d-1"] }));
    expect(isStale()).toBe(true);
  });

  it("başka kaydın sorgusu dokunmaz", async () => {
    const { client, wrapper, isStale } = setup();
    renderHook(() => useEvDayFreshness("s-1", "2026-09-24", "d-1", "draft"), { wrapper });
    await act(() => client.fetchQuery({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY, "d-2"], queryFn: async () => 1 }));
    await act(() => client.refetchQueries({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY, "d-2"] }));
    expect(isStale()).toBe(false);
  });

  it("kayıt açıldı / gönderildi (kimlik ya da durum değişti) → tazeler", () => {
    const { wrapper, isStale } = setup();
    const { rerender } = renderHook(({ id, status }) => useEvDayFreshness("s-1", "2026-09-24", id, status), {
      wrapper,
      initialProps: { id: null as string | null, status: null as string | null },
    });
    expect(isStale()).toBe(false);
    rerender({ id: "d-1", status: "draft" });
    expect(isStale()).toBe(true);
  });
});
