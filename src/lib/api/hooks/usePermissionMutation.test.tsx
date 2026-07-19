import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePermissionMutation } from "./usePermissionMutation";
import { ROLE_PERMISSIONS_QUERY_KEY } from "./useRolePermissions";
import type { PermissionCell } from "@/lib/api/models";

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePermissionMutation", () => {
  it("optimistic gunceller, backend hatasinda rollback yapar", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = [ROLE_PERMISSIONS_QUERY_KEY, "r1"];
    client.setQueryData<PermissionCell[]>(key, [{ module_key: "stok", access_level: "none", scope: "all" }]);

    // Mock fetch'i kasitli olarak geciktiriyoruz: onMutate'in optimistic yazimi
    // mikrogorev kuyrugunda hemen olur, ama gecikmesiz bir mock ile mutationFn
    // hatasi (ve onError rollback'i) de ayni turda tamamlanir — waitFor'un ilk
    // (varsayilan 50ms araliklarla calisan) kontrolu optimistic durumu hic
    // yakalayamaz, direkt rollback edilmis degeri gorur. 100ms gecikme,
    // optimistic durumun en az bir waitFor kontrol turunda gozlemlenebilir
    // kalmasini saglar.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Promise<Response>((resolve) =>
            setTimeout(
              () => resolve(new Response(JSON.stringify({ detail: "yetki yok" }), { status: 403 })),
              100,
            ),
          ),
      ),
    );

    const { result } = renderHook(() => usePermissionMutation(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ roleId: "r1", moduleKey: "stok", update: { access_level: "full", scope: "all" } });
    });

    // onMutate hemen optimistic yazar
    await waitFor(() => {
      const data = client.getQueryData<PermissionCell[]>(key);
      expect(data?.[0].access_level).toBe("full");
    });

    // hata → rollback
    await waitFor(() => expect(result.current.isError).toBe(true));
    const rolledBack = client.getQueryData<PermissionCell[]>(key);
    expect(rolledBack?.[0].access_level).toBe("none");
  });
});
