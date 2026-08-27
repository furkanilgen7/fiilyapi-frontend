import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteProgressPaymentsView } from "./SiteProgressPaymentsView";
import { useProgressPayments, useProgressPaymentSummary } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";

// F-SZLEKR T2 — ÇAĞIRAN-DÜZEYİ BEKÇİ (bkz. ProgressPaymentsView.test.tsx'te
// aynı desen): şantiye "Hakedişler" sekmesinin düğme etiketi ile boş-durum
// ipucundaki eylem etiketinin AYNI sabitten geldiğini kanıtlar. Bu ekranın
// etiketi ("+ Hakediş Oluştur") `ProgressPaymentsView`inkinden ("+ Yeni
// Hakediş") KASITLI OLARAK FARKLI — o tutarsızlık bu dilimin kapsamı DIŞINDA.

vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayments: vi.fn(),
  useProgressPaymentSummary: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSiteSubcontractorPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSiteSubcontractorPayments")>()),
  useSiteSubcontractorPayments: vi.fn(),
}));

vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p-1", siteId: "s-1" }),
}));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "ayse@ornek.com",
  full_name: "Ayşe Yılmaz",
  title: null,
  role_key: "procurement",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

function mockPaymentsQuery(value: Partial<ReturnType<typeof useProgressPayments>>) {
  vi.mocked(useProgressPayments).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession({ progress_payments: "draft" });
  vi.mocked(useSite).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useProgressPaymentSummary).mockReturnValue({
    isSuccess: false,
    data: undefined,
  } as never);
  vi.mocked(useSiteSubcontractorPayments).mockReturnValue({
    items: [],
    isLoading: false,
    isError: false,
    isPartial: false,
    truncation: { isTruncated: false },
  } as never);
  mockPaymentsQuery({ data: { items: [] } });
});

describe("SiteProgressPaymentsView — boş durum eylem etiketi tek kaynak", () => {
  it("düğme etiketi ile boş-durum ipucundaki eylem etiketi AYNI metindir", () => {
    mockSession({ progress_payments: "draft" });
    render(<SiteProgressPaymentsView />);
    const buttonLabel = screen.getByRole("link", { name: /Hakediş Oluştur/ }).textContent;
    expect(screen.getByText(`${buttonLabel} ile başlayın`)).toBeInTheDocument();
  });

  it("salt-okunur yetkide boş-durum ipucu eylem VAAT ETMEZ (dürüst metin)", () => {
    mockSession({ progress_payments: "view" });
    render(<SiteProgressPaymentsView />);
    expect(screen.queryByRole("link", { name: /Hakediş Oluştur/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/ile başlayın/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Hakedişler ekranından oluşturulan kayıtlar burada listelenir"),
    ).toBeInTheDocument();
  });

  it("bu ekranın etiketi ProgressPaymentsView'inkinden farklıdır (kasıtlı, birleştirilmedi)", () => {
    mockSession({ progress_payments: "draft" });
    render(<SiteProgressPaymentsView />);
    expect(screen.getByRole("link", { name: "+ Hakediş Oluştur" })).toBeInTheDocument();
  });
});
