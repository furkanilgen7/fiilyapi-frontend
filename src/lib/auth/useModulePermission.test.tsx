import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useModulePermission } from "./useModulePermission";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";

// Kaynak oturum yüküdür (spec §2.5.2) — hook kendi isteğini ATMAZ, bu yüzden
// sağlayıcı yerine `useSession` taklit edilir.
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "ayse@ornek.com",
  full_name: "Ayşe Yılmaz",
  title: null,
  role_key: "procurement",
  status: "active",
} as unknown as MeResponse;

/** BE-A sonrası `permissions` alanının geleceği hâli taklit eder. */
function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

describe("useModulePermission — bilinmezlik kuralı (spec §2.5.3)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ⚠️ KAPI: MeResponse'ta izin alanı BE-A'ya kadar YOK. Gizleme bu hâlde
  // devreye girerse tam yetkili kullanıcı ekranı salt-okunur görür.
  it("permissions alanı yokken canWrite true (bilinmezlik kuralı)", () => {
    mockSession();
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.level).toBeUndefined();
    expect(result.current.canWrite).toBe(true);
    expect(result.current.canView).toBe(true);
  });

  it("oturum henüz yüklenmemişken canWrite true", () => {
    vi.mocked(useSession).mockReturnValue({ me: null, isLoading: true });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.level).toBeUndefined();
    expect(result.current.canWrite).toBe(true);
  });

  it("modül anahtarı haritada yokken canWrite true", () => {
    mockSession({ contracts: "full" });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.level).toBeUndefined();
    expect(result.current.canWrite).toBe(true);
  });

  it("tanınmayan seviye değeri bilinmezliğe düşer, yazma serbest kalır", () => {
    mockSession({ boq: "superuser" });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.level).toBeUndefined();
    expect(result.current.canWrite).toBe(true);
  });
});

describe("useModulePermission — seviye bilindiğinde (spec §2.5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("boq: 'view' iken canWrite false, canView true", () => {
    mockSession({ boq: "view" });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.level).toBe("view");
    expect(result.current.canWrite).toBe(false);
    expect(result.current.canView).toBe(true);
  });

  it("boq: 'full' iken canWrite true", () => {
    mockSession({ boq: "full" });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.canWrite).toBe(true);
    expect(result.current.canView).toBe(true);
  });

  it("boq: 'none' iken canView de false", () => {
    mockSession({ boq: "none" });
    const { result } = renderHook(() => useModulePermission("boq"));
    expect(result.current.canView).toBe(false);
    expect(result.current.canWrite).toBe(false);
  });

  // Spec §2.5.4: aynı hook sonraki ekranlarda moduleKey değiştirilerek kullanılır.
  it("moduleKey parametre olarak alınır; koda gömülü modül listesi yoktur", () => {
    mockSession({ boq: "view", contracts: "full", progress_payments: "approve" });
    expect(renderHook(() => useModulePermission("boq")).result.current.canWrite).toBe(false);
    expect(renderHook(() => useModulePermission("contracts")).result.current.canWrite).toBe(true);
    expect(
      renderHook(() => useModulePermission("progress_payments")).result.current.level,
    ).toBe("approve");
  });
});

describe("useModulePermission — ağ davranışı (spec §2.5.2)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("hook hiçbir ağ isteği atmaz", () => {
    mockSession({ boq: "view" });
    renderHook(() => useModulePermission("boq"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
