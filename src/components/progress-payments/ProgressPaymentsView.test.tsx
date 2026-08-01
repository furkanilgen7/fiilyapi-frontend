import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsView } from "./ProgressPaymentsView";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayments: vi.fn(),
}));

// `useModulePermission` ağ isteği atmaz, kaynağı `useSession`'dır — kapı
// testlerinde o taklit edilir (bkz. `useModulePermission.test.tsx`).
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

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

function mockQuery(value: Partial<ReturnType<typeof useProgressPayments>>) {
  vi.mocked(useProgressPayments).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

const baseItem = {
  id: "22222222-2222-2222-2222-222222222222",
  project_id: "33333333-3333-3333-3333-333333333333",
  project_name: "Güneşkent A-Blok",
  sequence_no: 5,
  period_year: 2026,
  period_month: 5,
  description: "Kat 6–8 döşeme",
  status: "pending_approval" as const,
  gross_total: "2100000.00",
  net_total: "2000000.00",
};

describe("ProgressPaymentsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession({ progress_payments: "draft" });
  });

  it("yukleniyor durumunu basar", () => {
    mockQuery({ isLoading: true });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    mockQuery({ isError: true, error: new Error("patladi") });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("Hakedişler yüklenemedi")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hakedişler" })).not.toBeInTheDocument();
  });

  it("bos listede bos durum metni basar", () => {
    mockQuery({ data: { items: [] } });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("Henüz hakediş oluşturulmadı")).toBeInTheDocument();
  });

  it("satiri basar: baslik, aciklama, tutar, rozet, detay linki", () => {
    mockQuery({ data: { items: [baseItem] } });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
    expect(screen.getByText("#5 — Mayıs 2026")).toBeInTheDocument();
    expect(screen.getByText("Kat 6–8 döşeme")).toBeInTheDocument();
    expect(screen.getByText("₺ 2.100.000")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekliyor")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Güneşkent A-Blok/ });
    expect(link).toHaveAttribute("href", "/hakedisler/22222222-2222-2222-2222-222222222222");
  });

  it("aciklama null ise satiri basmaz", () => {
    mockQuery({ data: { items: [{ ...baseItem, description: null }] } });
    render(<ProgressPaymentsView />);
    expect(screen.queryByText("Kat 6–8 döşeme")).not.toBeInTheDocument();
  });

  it("donem null ise yalniz #N basar", () => {
    mockQuery({
      data: { items: [{ ...baseItem, period_year: null, period_month: null }] },
    });
    render(<ProgressPaymentsView />);
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.queryByText(/Mayıs/)).not.toBeInTheDocument();
  });

  it("hicbir satirda '%62 ilerleme' gibi ilerleme metni basilmaz (liste semasinda yok)", () => {
    mockQuery({ data: { items: [baseItem] } });
    render(<ProgressPaymentsView />);
    expect(screen.queryByText(/ilerleme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/%\d/)).not.toBeInTheDocument();
  });

  it.each([
    ["draft", "Taslak"],
    ["pending_approval", "Onay Bekliyor"],
    ["approved", "Onaylandı"],
    ["paid", "Ödendi"],
  ] as const)("durum %s icin rozet metni %s basar", (status, label) => {
    mockQuery({ data: { items: [{ ...baseItem, status }] } });
    render(<ProgressPaymentsView />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("yazma yetkisi varken 'Yeni Hakediş' butonu gorunur", () => {
    mockSession({ progress_payments: "draft" });
    mockQuery({ data: { items: [] } });
    render(<ProgressPaymentsView />);
    expect(screen.getByRole("link", { name: "+ Yeni Hakediş" })).toHaveAttribute(
      "href",
      "/hakedisler/yeni",
    );
  });

  it("salt-okunur yetkide 'Yeni Hakediş' butonu gorunmez", () => {
    mockSession({ progress_payments: "view" });
    mockQuery({ data: { items: [] } });
    render(<ProgressPaymentsView />);
    expect(screen.queryByRole("link", { name: "+ Yeni Hakediş" })).not.toBeInTheDocument();
  });
});
