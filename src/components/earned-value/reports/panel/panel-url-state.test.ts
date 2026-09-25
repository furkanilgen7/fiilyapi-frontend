import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { todayIso, usePanelUrlState } from "./panel-url-state";

let searchParams = new URLSearchParams();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/planlama/panel",
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
});

describe("usePanelUrlState — `?tarih=`", () => {
  it("geçerli ISO tarih AYNEN okunur", () => {
    searchParams = new URLSearchParams("tarih=2026-09-24");
    const { result } = renderHook(() => usePanelUrlState());
    expect(result.current.date).toBe("2026-09-24");
  });

  it("parametre yoksa/takvimde yoksa BUGÜNE (Europe/Istanbul) düşer", () => {
    expect(renderHook(() => usePanelUrlState()).result.current.date).toBe(todayIso());
    searchParams = new URLSearchParams("tarih=2026-02-30");
    expect(renderHook(() => usePanelUrlState()).result.current.date).toBe(todayIso());
  });

  it("setDate → router.replace ile ?tarih= güncellenir, DİĞER parametreler korunur", () => {
    searchParams = new URLSearchParams("aralik=3m");
    const { result } = renderHook(() => usePanelUrlState());
    result.current.setDate("2026-09-20");
    expect(replaceMock).toHaveBeenCalledWith("/planlama/panel?aralik=3m&tarih=2026-09-20", { scroll: false });
  });
});

describe("usePanelUrlState — `?aralik=`", () => {
  it.each(["4w", "3m", "all"] as const)("geçerli değer (%s) AYNEN okunur", (value) => {
    searchParams = new URLSearchParams(`aralik=${value}`);
    expect(renderHook(() => usePanelUrlState()).result.current.range).toBe(value);
  });

  it("yok/geçersiz → varsayılan '4w'", () => {
    expect(renderHook(() => usePanelUrlState()).result.current.range).toBe("4w");
    searchParams = new URLSearchParams("aralik=bozuk");
    expect(renderHook(() => usePanelUrlState()).result.current.range).toBe("4w");
  });

  it("setRange → router.replace ile ?aralik= güncellenir", () => {
    const { result } = renderHook(() => usePanelUrlState());
    result.current.setRange("all");
    expect(replaceMock).toHaveBeenCalledWith("/planlama/panel?aralik=all", { scroll: false });
  });
});

describe("usePanelUrlState — `?disiplin=` / `?yuklenici=`", () => {
  it("disiplin yoksa null (Tüm disiplinler)", () => {
    expect(renderHook(() => usePanelUrlState()).result.current.disciplineId).toBeNull();
  });

  it("disiplin varsa AYNEN okunur (backend node kimliği, biçim doğrulanmaz)", () => {
    searchParams = new URLSearchParams("disiplin=d:KAB");
    expect(renderHook(() => usePanelUrlState()).result.current.disciplineId).toBe("d:KAB");
  });

  it("yuklenici geçerli (own/subcon) değilse null (Hepsi)", () => {
    expect(renderHook(() => usePanelUrlState()).result.current.contractorType).toBeNull();
    searchParams = new URLSearchParams("yuklenici=bozuk");
    expect(renderHook(() => usePanelUrlState()).result.current.contractorType).toBeNull();
  });

  it("yuklenici geçerliyse AYNEN okunur", () => {
    searchParams = new URLSearchParams("yuklenici=own");
    expect(renderHook(() => usePanelUrlState()).result.current.contractorType).toBe("own");
  });

  it("setDisciplineId(null) → parametre SİLİNİR (Tüm disiplinler'e dönüş)", () => {
    searchParams = new URLSearchParams("disiplin=d:KAB");
    const { result } = renderHook(() => usePanelUrlState());
    result.current.setDisciplineId(null);
    expect(replaceMock).toHaveBeenCalledWith("/planlama/panel", { scroll: false });
  });

  it("setContractorType → router.replace ile ?yuklenici= güncellenir", () => {
    const { result } = renderHook(() => usePanelUrlState());
    result.current.setContractorType("subcon");
    expect(replaceMock).toHaveBeenCalledWith("/planlama/panel?yuklenici=subcon", { scroll: false });
  });
});

describe("todayIso — Europe/Istanbul takvim günü", () => {
  it("UTC gece yarısı sonrası TR'de bir sonraki güne taşar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T22:30:00Z"));
    expect(todayIso()).toBe("2026-09-24");
    vi.useRealTimers();
  });
});
