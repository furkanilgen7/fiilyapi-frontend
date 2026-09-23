import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "./useLogout";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("useLogout", () => {
  it("logout endpoint'ini POST ile çağırır ve başarılı yanıtta /login'e yönlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(result.current.error).toBeNull();
  });

  it("BFF başarısız yanıt döndürdüğünde yönlendirmez ve görünür hata basar", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Çıkış yapılamadı, tekrar deneyin.");
  });

  it("ağ hatasında (fetch reddi) sessizce yutmaz, görünür hata basar ve yönlendirmez", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Çıkış yapılamadı, tekrar deneyin.");
  });
});
