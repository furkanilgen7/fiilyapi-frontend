import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubcontractorProgressPaymentForm } from "./SubcontractorProgressPaymentForm";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";
import {
  useSubcontractorContract,
  useSubcontractorProgressPayment,
} from "@/lib/api/hooks/useSubcontractorProgressPayments";
import {
  useCreateSubcontractorProgressPayment,
  useReplaceSubcontractorProgressPaymentLines,
  useSubmitSubcontractorProgressPayment,
  useUpdateSubcontractorProgressPayment,
} from "@/lib/api/hooks/useSubcontractorProgressPaymentMutations";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSite } from "@/lib/api/hooks/useSites";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/api/hooks/useSubcontractorProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSubcontractorProgressPayments")>()),
  useSubcontractorContract: vi.fn(),
  useSubcontractorProgressPayment: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSubcontractorProgressPaymentMutations", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/api/hooks/useSubcontractorProgressPaymentMutations")
  >()),
  useCreateSubcontractorProgressPayment: vi.fn(),
  useUpdateSubcontractorProgressPayment: vi.fn(),
  useReplaceSubcontractorProgressPaymentLines: vi.fn(),
  useSubmitSubcontractorProgressPayment: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

const CONTRACT_ID = "33333333-3333-3333-3333-333333333333";
const PAYMENT_ID = "22222222-2222-2222-2222-222222222222";
const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

const ITEM_MANUAL = {
  id: "item-1",
  contract_id: CONTRACT_ID,
  source_contract_item_id: null,
  code: "03.010",
  description: "Döşeme Kalıbı",
  unit: "m²",
  quantity: "0",
  unit_price: "95.00",
  sort_order: 0,
  group: { id: "g-2", name: "B — Kalıp İşleri" },
  line_total: "0",
};
const ITEM_DIARY = {
  id: "item-2",
  contract_id: CONTRACT_ID,
  source_contract_item_id: null,
  code: "03.001",
  description: "Kat Döşemesi Betonu C25/30",
  unit: "m³",
  quantity: "0",
  unit_price: "1200.00",
  sort_order: 1,
  group: { id: "g-1", name: "A — Betonarme İşleri" },
  line_total: "0",
};

function contractFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTRACT_ID,
    project_id: PROJECT_ID,
    site_id: SITE_ID,
    subcontractor_id: "sub-1",
    subcontractor_name: "Akın İnşaat",
    work_category: "Betonarme",
    contract_no: "TSZ-2025-001",
    signature_date: "2026-01-01",
    is_notarized: true,
    start_date: "2026-01-01",
    end_date: null,
    late_penalty_daily: null,
    advance_pct: "10.00",
    retainage_pct: "5.00",
    vat_pct: "20.00",
    payment_period: "monthly",
    payment_term_days: 30,
    materials_by_contractor: false,
    subcontractor_files_own_sgk: true,
    vat_withholding: false,
    status: "active",
    is_draft: false,
    items: [ITEM_MANUAL, ITEM_DIARY],
    contract_total: "0",
    items_missing_price: 0,
    ...overrides,
  };
}

function detailFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    contract_id: CONTRACT_ID,
    project_id: PROJECT_ID,
    project_name: "Güneşkent Konut",
    subcontractor_name: "Akın İnşaat",
    contract_no: "TSZ-2025-001",
    sequence_no: 48,
    period_year: 2026,
    period_month: 7,
    description: null,
    status: "draft",
    vat_pct: "20.00",
    advance_pct: "10.00",
    retainage_pct: "5.00",
    default_coefficient: "1",
    section_id: null,
    submitted_at: null,
    approved_at: null,
    approved_by: null,
    paid_at: null,
    rejected_at: null,
    rejection_reason: null,
    is_revision_required: false,
    created_by: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    lines: [],
    calculation: { gross: "859400.00", vat: "171880.00", advance_deduction: "85940.00", retention: "42970.00", net: "902370.00" },
    dropped_orphan_count: 0,
    ...overrides,
  };
}

const BASE_ME = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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

function queryResult<T>(value: Partial<{ data: T; isLoading: boolean; isError: boolean; error: unknown }>) {
  return { data: undefined, isLoading: false, isError: false, error: null, ...value } as never;
}

function mutationResult(overrides: Partial<{ mutate: ReturnType<typeof vi.fn>; isPending: boolean }> = {}) {
  return { mutate: vi.fn(), isPending: false, ...overrides } as never;
}

function backendError(status: number, detail: string) {
  return new BackendError(status, { detail });
}

function setupCommonMocks() {
  mockSession({ progress_payments: "draft" });
  vi.mocked(useProject).mockReturnValue(queryResult({ data: { id: PROJECT_ID, name: "Güneşkent Konut Projesi" } }));
  vi.mocked(useSite).mockReturnValue(
    queryResult({
      data: {
        id: SITE_ID,
        name: "A-Blok Şantiyesi",
        sections: [{ id: "sec-1", code: "K6-10", name: "Kat 6–10 Kaba İnşaat", status: "active", manager_name: null, start_date: null, end_date: null, sort_order: 0, progress_pct: null, boq_item_count: null, budget: null, worker_count: null }],
      },
    }),
  );
  vi.mocked(useSubcontractorContract).mockReturnValue(queryResult({ data: contractFixture() }));
  vi.mocked(useSubcontractorProgressPayment).mockReturnValue(queryResult({}));
  vi.mocked(useCreateSubcontractorProgressPayment).mockReturnValue(mutationResult());
  vi.mocked(useUpdateSubcontractorProgressPayment).mockReturnValue(mutationResult());
  vi.mocked(useReplaceSubcontractorProgressPaymentLines).mockReturnValue(mutationResult());
  vi.mocked(useSubmitSubcontractorProgressPayment).mockReturnValue(mutationResult());
}

function renderForm(props: Parameters<typeof SubcontractorProgressPaymentForm>[0]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SubcontractorProgressPaymentForm {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupCommonMocks();
});

describe("SubcontractorProgressPaymentForm — izin", () => {
  it("yazma izni yoksa AccessDenied basar", () => {
    mockSession({ progress_payments: "view" });
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("SubcontractorProgressPaymentForm — create/edit aynı bileşen", () => {
  it("create kipinde 'Hakediş Oluştur' başlığını basar", async () => {
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    expect(await screen.findByText(/Hakediş Oluştur/)).toBeInTheDocument();
  });

  it("edit kipinde '#N Düzenle' başlığını basar", async () => {
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(queryResult({ data: detailFixture() }));
    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    expect(await screen.findByText(/Hakediş #48 Düzenle/)).toBeInTheDocument();
  });

  it("edit kipinde draft değilse Türkçe uyarı basar, form gösterilmez", () => {
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(
      queryResult({ data: detailFixture({ status: "pending_approval" }) }),
    );
    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    expect(
      screen.getByText("Bu hakediş artık taslak durumunda değil, düzenlenemez."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hakediş Kalemleri")).not.toBeInTheDocument();
  });
});

describe("SubcontractorProgressPaymentForm — quantity_source iki dalı", () => {
  it("manual kaynaklı satırda 'Elle giriş' basar", async () => {
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    expect(await screen.findAllByText("Elle giriş")).toHaveLength(2);
  });

  it("diary kaynaklı satırda rozet + vurgu basar (SD dilimiyle canlanacak altyapı)", async () => {
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(
      queryResult({
        data: detailFixture({
          lines: [
            {
              id: "line-2",
              contract_item_id: ITEM_DIARY.id,
              code: ITEM_DIARY.code,
              description: ITEM_DIARY.description,
              unit: ITEM_DIARY.unit,
              contract_unit_price: "1200.00",
              coefficient: "1",
              quantity: "320",
              group_name: "A — Betonarme İşleri",
              sort_order: 1,
              quantity_source: "diary",
              adjusted_unit_price: "1200.00",
              line_total: "384000.00",
            },
          ],
        }),
      }),
    );
    const { container } = renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    await screen.findByText("Günlük kayıttan ↑");
    expect(container.textContent).toContain("Günlük kayıttan: 320 m³ hesaplandı");
  });
});

describe("SubcontractorProgressPaymentForm — tfoot", () => {
  it("edit kipinde 5 satırı ve yüzde etiketlerini şemadan (sözleşmeden) basar", async () => {
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(queryResult({ data: detailFixture() }));
    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    expect(await screen.findByText("TOPLAM HAKEDİŞ")).toBeInTheDocument();
    expect(screen.getByText("KDV (%20)")).toBeInTheDocument();
    expect(screen.getByText("Avans Kesintisi (%10)")).toBeInTheDocument();
    expect(screen.getByText("Teminat Kesintisi (%5)")).toBeInTheDocument();
    expect(screen.getByText("NET ÖDENECEK")).toBeInTheDocument();
  });

  it("create kipinde (henüz calculation yokken) tutar '—' basar ama satır/etiket yapısı korunur", async () => {
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    expect(await screen.findByText("TOPLAM HAKEDİŞ")).toBeInTheDocument();
    expect(screen.getByText("KDV (%20)")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("SubcontractorProgressPaymentForm — PUT lines TÜM satırları gönderir (EN KRİTİK)", () => {
  it("create: Taslak Kaydet'e basınca TÜM satırlar (miktarı 0 dahil) tek gövdede PUT edilir", async () => {
    const createMutate = vi.fn((_vars, opts) => opts?.onSuccess?.({ id: PAYMENT_ID }));
    const replaceMutate = vi.fn();
    vi.mocked(useCreateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: createMutate }));
    vi.mocked(useReplaceSubcontractorProgressPaymentLines).mockReturnValue(mutationResult({ mutate: replaceMutate }));

    renderForm({ mode: "create", contractId: CONTRACT_ID });
    await screen.findByText(/Hakediş Oluştur/);
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(replaceMutate).toHaveBeenCalledTimes(1);
    const [{ body }] = replaceMutate.mock.calls[0];
    expect(body.lines).toHaveLength(2);
    expect(body.lines.every((l: { quantity: string }) => l.quantity === "0")).toBe(true);
    expect(body.lines.map((l: { contract_item_id: string }) => l.contract_item_id).sort()).toEqual(
      [ITEM_MANUAL.id, ITEM_DIARY.id].sort(),
    );
  });

  it("edit: PATCH başarılı olunca PUT …/lines TÜM satırlarla çağrılır", async () => {
    const updateMutate = vi.fn((_vars, opts) => opts?.onSuccess?.());
    const replaceMutate = vi.fn();
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(queryResult({ data: detailFixture() }));
    vi.mocked(useUpdateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: updateMutate }));
    vi.mocked(useReplaceSubcontractorProgressPaymentLines).mockReturnValue(mutationResult({ mutate: replaceMutate }));

    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    await screen.findByText(/Hakediş #48 Düzenle/);
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(replaceMutate).toHaveBeenCalledTimes(1);
    const [{ body }] = replaceMutate.mock.calls[0];
    expect(body.lines).toHaveLength(2);
  });
});

describe("SubcontractorProgressPaymentForm — 409/422 Türkçe hata mesajları", () => {
  it("409 — oluşturma çakışması Türkçe mesajını gösterir", async () => {
    const createMutate = vi.fn((_vars, opts) =>
      opts?.onError?.(backendError(409, "Bu sözleşmede açık bir taslak hakediş var.")),
    );
    vi.mocked(useCreateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: createMutate }));
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    await screen.findByText(/Hakediş Oluştur/);
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(await screen.findByTestId("thf-form-error")).toHaveTextContent(
      "Bu sözleşmede açık bir taslak hakediş var.",
    );
  });

  it("422 — satır kaydetme doğrulama hatasını gösterir", async () => {
    const createMutate = vi.fn((_vars, opts) => opts?.onSuccess?.({ id: PAYMENT_ID }));
    const replaceMutate = vi.fn((_vars, opts) =>
      opts?.onError?.(backendError(422, "Miktar negatif olamaz.")),
    );
    vi.mocked(useCreateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: createMutate }));
    vi.mocked(useReplaceSubcontractorProgressPaymentLines).mockReturnValue(mutationResult({ mutate: replaceMutate }));
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    await screen.findByText(/Hakediş Oluştur/);
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(await screen.findByTestId("thf-form-error")).toHaveTextContent("Miktar negatif olamaz.");
  });

  it("409 — güncelleme çakışması (taslak dışı) Türkçe fallback mesajını gösterir", async () => {
    const updateMutate = vi.fn((_vars, opts) => opts?.onError?.(backendError(409, "yalniz taslak guncellenebilir")));
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(queryResult({ data: detailFixture() }));
    vi.mocked(useUpdateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: updateMutate }));
    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    await screen.findByText(/Hakediş #48 Düzenle/);
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(await screen.findByTestId("thf-form-error")).toHaveTextContent("yalniz taslak guncellenebilir");
  });
});

describe("SubcontractorProgressPaymentForm — form doğrulama", () => {
  it("dönem seçilmemişse (yıl boşaltılırsa) Taslak Kaydet Türkçe hata verir, mutate ÇAĞRILMAZ", async () => {
    const createMutate = vi.fn();
    vi.mocked(useCreateSubcontractorProgressPayment).mockReturnValue(mutationResult({ mutate: createMutate }));
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    await screen.findByText(/Hakediş Oluştur/);
    await userEvent.clear(screen.getByLabelText("Hakediş yılı"));
    await userEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(await screen.findByTestId("thf-form-error")).toHaveTextContent("Dönem seçimi zorunludur.");
    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe("SubcontractorProgressPaymentForm — dropped_orphan_count uyarısı", () => {
  it("dropped_orphan_count > 0 iken Türkçe uyarı basar", async () => {
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue(
      queryResult({ data: detailFixture({ dropped_orphan_count: 2 }) }),
    );
    renderForm({ mode: "edit", paymentId: PAYMENT_ID });
    expect(await screen.findByTestId("thf-dropped-orphan-alert")).toBeInTheDocument();
  });
});

describe("SubcontractorProgressPaymentForm — hiyerarşi şeridi ve ölü link koruması", () => {
  it("'Sözleşmeyi Gör' linki BASILMAZ (hedef rota yok)", async () => {
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    await screen.findByText(/Hakediş Oluştur/);
    expect(screen.queryByText("Sözleşmeyi Gör →")).not.toBeInTheDocument();
  });

  it("işveren sözleşme no halkası zarif düşüşle basılır (pending, silinmez)", async () => {
    renderForm({ mode: "create", contractId: CONTRACT_ID });
    const hierarchy = await screen.findByTestId("thf-hierarchy");
    expect(hierarchy).toBeInTheDocument();
  });
});
