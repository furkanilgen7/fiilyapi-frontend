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
  it("logout endpoint'ini POST ile çağırır ve /login'e yönlendirir", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
