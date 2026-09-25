import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayIso, useDailyReportUrlState } from "./daily-url-state";

let searchParams = new URLSearchParams();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/gunluk-rapor",
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
});

describe("useDailyReportUrlState — GİR '?tarih=' (S15)", () => {
  it("geçerli ISO tarih AYNEN okunur", () => {
    searchParams = new URLSearchParams("tarih=2026-09-24");
    const { result } = renderHook(() => useDailyReportUrlState());
    expect(result.current.date).toBe("2026-09-24");
  });

  it("parametre YOKSA bugüne (Europe/Istanbul) düşer", () => {
    const { result } = renderHook(() => useDailyReportUrlState());
    expect(result.current.date).toBe(todayIso());
  });

  it("takvimde OLMAYAN gün (30 Şubat, isValidIsoDate — çekirdek site-diary/derive.ts) → bugüne düşer, 422'ye ÇIKMAZ", () => {
    searchParams = new URLSearchParams("tarih=2026-02-30");
    const { result } = renderHook(() => useDailyReportUrlState());
    expect(result.current.date).toBe(todayIso());
  });

  it("biçimsiz girdi (regex'i bile geçmeyen) → bugüne düşer", () => {
    searchParams = new URLSearchParams("tarih=bozuk-tarih");
    const { result } = renderHook(() => useDailyReportUrlState());
    expect(result.current.date).toBe(todayIso());
  });

  it("setDate → router.replace ile '?tarih=' güncellenir", () => {
    const { result } = renderHook(() => useDailyReportUrlState());
    result.current.setDate("2026-09-20");
    expect(replaceMock).toHaveBeenCalledWith("/gunluk-rapor?tarih=2026-09-20", { scroll: false });
  });
});

describe("todayIso — Europe/Istanbul takvim günü", () => {
  const REAL_TZ_INDEPENDENT_INSTANT = "2026-09-23T22:30:00Z"; // 24.09.2026 01:30 TR

  afterEach(() => {
    vi.useRealTimers();
  });

  it("UTC gece yarısı sonrası TR'de bir sonraki güne taşar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(REAL_TZ_INDEPENDENT_INSTANT));
    expect(todayIso()).toBe("2026-09-24");
  });
});
