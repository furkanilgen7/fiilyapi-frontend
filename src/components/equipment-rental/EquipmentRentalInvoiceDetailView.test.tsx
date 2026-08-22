import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";

import { EquipmentRentalInvoiceDetailView } from "./EquipmentRentalInvoiceDetailView";
import { useEquipmentRentalInvoice } from "@/lib/api/hooks/useEquipmentRentalInvoices";
import type { RentalInvoiceDetailResponse } from "@/lib/api/hooks/useEquipmentRentalInvoices";
import { useSuppliers } from "@/lib/api/hooks/useSuppliers";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";

/*
 * F-KIRA FINAL REVIEW BEKÇİSİ — YÜKLEME/HATA DALLARININ SIRASI.
 *
 * 🔴 BULUNAN KUSUR: hata dalı, yükleme dalından SONRA yazılmıştı. Hata
 * hâlinde `isLoading` false olur ama `data` yine `undefined`, dolayısıyla
 * ondan türeyen form taslağı da `null` kalır — yükleme koşulu bunu yutuyordu
 * ve ekran SONSUZA KADAR "Yükleniyor…" basıyordu. Kullanıcı hatayı HİÇ
 * görmezdi ve "sessiz atlama yok" kuralı fiilen çiğnenirdi.
 *
 * Dört kapının dördü de bunu göremezdi (tip doğru, lint temiz, derleme
 * geçiyor) ve e2e'de bir sunucu hatasını zorlamak da kolay değil — bu yüzden
 * bekçi BURADA, dalların doğrudan çakıldığı yerde yaşar.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/makine/kira/rental-2",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useEquipmentRentalInvoices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEquipmentRentalInvoices")>()),
  useEquipmentRentalInvoice: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSuppliers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSuppliers")>()),
  useSuppliers: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSiteOptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSiteOptions")>()),
  useSiteOptions: vi.fn(),
}));

const mockDetail = vi.mocked(useEquipmentRentalInvoice);
const mockSuppliers = vi.mocked(useSuppliers);
const mockSites = vi.mocked(useSiteOptions);
const mockSession = vi.mocked(useSession);

type DetailQuery = UseQueryResult<RentalInvoiceDetailResponse, Error>;

/** Mutasyon hook'lari bir `QueryClient` ister (invalidate icin). */
function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EquipmentRentalInvoiceDetailView invoiceId="rental-2" />
    </QueryClientProvider>,
  );
}

function detailQuery(overrides: Partial<DetailQuery>): DetailQuery {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    ...overrides,
  } as DetailQuery;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockReturnValue({
    me: { permissions: { equipment: "full" } } as unknown as MeResponse,
  } as unknown as ReturnType<typeof useSession>);
  mockSuppliers.mockReturnValue({
    data: { items: [], total: 0, limit: 200, offset: 0 },
    isSuccess: true,
  } as unknown as ReturnType<typeof useSuppliers>);
  mockSites.mockReturnValue({ options: [], isLoading: false, isError: false });
});

describe("EquipmentRentalInvoiceDetailView · yükleme/hata dallarının SIRASI", () => {
  it("🔴 HATA hâlinde 'Yükleniyor…' DEĞİL hata mesajı basılır", () => {
    mockDetail.mockReturnValue(
      detailQuery({ isError: true, error: new Error("500") }),
    );

    renderView();

    expect(screen.getByText("Kira hakedişi yüklenemedi.")).toBeVisible();
    // Kusur geri gelirse BU iddia kırılır: hata yükleme dalına yutulurdu.
    expect(screen.queryByText("Yükleniyor…")).toBeNull();
  });

  it("gerçekten yüklenirken 'Yükleniyor…' basılır (dal hâlâ çalışıyor)", () => {
    mockDetail.mockReturnValue(detailQuery({ isLoading: true }));

    renderView();

    expect(screen.getByText("Yükleniyor…")).toBeVisible();
    expect(screen.queryByText("Kira hakedişi yüklenemedi.")).toBeNull();
  });
});
