import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteDiaryEntryView } from "./SiteDiaryEntryView";
import { isoDate } from "./derive";
import { useSiteDiaryEntries, useSiteDiaryEntry } from "@/lib/api/hooks/useSiteDiary";
import {
  useCreateSiteDiaryEntry,
  useReopenSiteDiaryEntry,
  useSaveSiteDiaryLines,
  useSubmitSiteDiaryEntry,
  useUpdateSiteDiaryEntry,
} from "@/lib/api/hooks/useSiteDiaryMutations";
import { useSitePlanDaySummary } from "@/lib/api/hooks/useSitePlanDaySummary";
import { useSite } from "@/lib/api/hooks/useSites";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

// F-SD T6 · "Kayıt Gir" ekranının DAL testleri: 409 akışı, izin dalları,
// `submitted` salt-okunurluğu ve "Yeniden Aç". Saf türevler kendi
// dosyalarında test edilir (form-state / worker-counts / recent-entries) —
// burada YALNIZ ekranın kararları doğrulanır.

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p-1", siteId: "s-1" }),
  usePathname: () => "/projeler/p-1/santiyeler/s-1/gunluk-kayit",
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteDiary", () => ({
  useSiteDiaryEntries: vi.fn(),
  useSiteDiaryEntry: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSiteDiaryMutations", () => ({
  useCreateSiteDiaryEntry: vi.fn(),
  useUpdateSiteDiaryEntry: vi.fn(),
  useSaveSiteDiaryLines: vi.fn(),
  useSubmitSiteDiaryEntry: vi.fn(),
  useReopenSiteDiaryEntry: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSitePlanDaySummary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSitePlanDaySummary")>()),
  useSitePlanDaySummary: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSite: vi.fn() }));
vi.mock("@/lib/api/hooks/useBoq", () => ({ useBoq: vi.fn() }));
vi.mock("@/lib/api/hooks/useProgressPayments", () => ({ useProgressPayments: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteSubcontractorPayments", () => ({
  useSiteSubcontractorPayments: vi.fn(),
}));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "sef@ornek.com",
  full_name: "Sercan Öztürk",
  title: null,
  role_key: "site_chief",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

/**
 * Ekranın aradığı gün. Varsayılan tarih BUGÜNdür (`isoDate(new Date())`) —
 * bu KAYAN bir hedeftir, sabit bir gün yazılırsa test yarın kırılır. Sahte
 * zamanlayıcı (`vi.useFakeTimers`) da KULLANILMAZ: `userEvent` ile birlikte
 * kilitleniyor (ölçüldü — etkileşimli testler 15 sn zaman aşımına düşüyor).
 * Bunun yerine fikstür, üretim koduyla AYNI türevden beslenir.
 */
const TODAY = isoDate(new Date());

const LINE = {
  id: "l-1",
  boq_item_id: "bi-1",
  code: "03.001",
  description: "C25/30 Beton",
  unit: "m³",
  unit_price: "1520.00",
  quantity: "120.000",
  cumulative_quantity: "900.000",
  line_amount: "182400.00",
};

function entryDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: TODAY,
    section_id: null,
    weather: "sunny",
    temperature_c: "28.0",
    work_done: "6. kat döşeme betonu döküldü.",
    chief_note: null,
    safety_meeting_held: true,
    ppe_checked: true,
    has_incident: false,
    incident_note: null,
    status: "draft",
    submitted_at: null,
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    updated_at: "2026-07-15T09:00:00Z",
    lines: [LINE],
    worker_counts: [],
    lines_total: "182400.00",
    worker_total: 0,
    dropped_orphan_count: 0,
    ...overrides,
  };
}

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: TODAY,
    section_id: null,
    weather: "sunny",
    has_incident: false,
    status: "draft",
    worker_total: 0,
    lines_total: "182400.00",
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    ...overrides,
  };
}

const createMutate = vi.fn();
const updateMutate = vi.fn();
const linesMutate = vi.fn();
const submitMutate = vi.fn();
const reopenMutate = vi.fn();
const refetchEntries = vi.fn();

function mockMutation(mutateAsync: ReturnType<typeof vi.fn>) {
  return { mutateAsync, mutate: vi.fn(), isPending: false } as never;
}

/**
 * Ekran gün eşlemesini `entries` listesinden yapar; `entry` verilirse liste de
 * o günü içerecek şekilde kurulur (gerçek akışın aynısı).
 */
function mockScreen(options: { entry?: Record<string, unknown>; entriesError?: unknown } = {}) {
  const entry = options.entry;
  vi.mocked(useSiteDiaryEntries).mockReturnValue({
    data: {
      items: entry ? [listItem({ id: entry.id, entry_date: entry.entry_date, status: entry.status })] : [],
      total: entry ? 1 : 0,
      limit: 50,
      offset: 0,
    },
    isLoading: false,
    isError: options.entriesError !== undefined,
    error: options.entriesError ?? null,
    refetch: refetchEntries,
  } as never);
  vi.mocked(useSiteDiaryEntry).mockReturnValue({
    data: entry,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession({ site_diary: "full", progress_payments: "view" });
  mockScreen();
  vi.mocked(useSite).mockReturnValue({
    data: { id: "s-1", name: "A-Blok Şantiyesi", project: { id: "p-1", name: "Güneşkent" }, sections: [] },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useBoq).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useProgressPayments).mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSiteSubcontractorPayments).mockReturnValue({
    items: [],
    isLoading: false,
    isError: false,
    isPartial: false,
    truncation: { isTruncated: false, shownCount: 0, totalCount: 0 },
  } as never);
  vi.mocked(useSitePlanDaySummary).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useCreateSiteDiaryEntry).mockReturnValue(mockMutation(createMutate));
  vi.mocked(useUpdateSiteDiaryEntry).mockReturnValue(mockMutation(updateMutate));
  vi.mocked(useSaveSiteDiaryLines).mockReturnValue(mockMutation(linesMutate));
  vi.mocked(useSubmitSiteDiaryEntry).mockReturnValue(mockMutation(submitMutate));
  vi.mocked(useReopenSiteDiaryEntry).mockReturnValue(mockMutation(reopenMutate));
});

function setupUser() {
  return userEvent.setup();
}

describe("SiteDiaryEntryView · izin dalları", () => {
  it("site_diary=none ise ekran hiç basılmaz (erişim reddi)", () => {
    mockSession({ site_diary: "none" });
    render(<SiteDiaryEntryView />);

    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Günlük Kayıt & Planlama" })).not.toBeInTheDocument();
  });

  it("liste 403 dönerse erişim reddi basılır", () => {
    mockScreen({ entriesError: new BackendError(403, { detail: "yasak" }) });
    render(<SiteDiaryEntryView />);

    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("site_diary=view (salt-okur PM) — form devre dışı, kaydetme yüzeyi YOK", () => {
    mockSession({ site_diary: "view" });
    mockScreen({ entry: entryDetail() });
    render(<SiteDiaryEntryView />);

    expect(
      screen.getByText("Bu modülde yalnız görüntüleme yetkiniz var — form salt-okunur."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Taslak Kaydet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kaydet & Gönder" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tarih")).toBeDisabled();
    expect(screen.getByLabelText("03.001 bugün yapılan miktar")).toBeDisabled();
  });

  it("yazma izniyle form açıktır", () => {
    mockScreen({ entry: entryDetail() });
    render(<SiteDiaryEntryView />);

    expect(screen.getByLabelText("Tarih")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Taslak Kaydet" })).toBeInTheDocument();
  });

  // Kullanıcı kararı (2026-08-04, spec §2 düzeltmesi): GK264 "Hakediş Durumu →"
  // mockup'ta `Şantiye - Hakedişler.dc.html`e gider — ŞANTİYE sekmesi, proje-genel
  // `/hakedisler` DEĞİL. Aynı ekrandaki GK408 "Hakedişler →" ile aynı hedef.
  it("GK264 'Hakediş Durumu →' şantiyenin Hakedişler sekmesine gider (proje-genele DEĞİL)", () => {
    mockScreen({ entry: entryDetail() });
    render(<SiteDiaryEntryView />);

    expect(screen.getByRole("link", { name: "Hakediş Durumu →" })).toHaveAttribute(
      "href",
      "/projeler/p-1/santiyeler/s-1/hakedisler",
    );
  });
});

describe("SiteDiaryEntryView · gönderilmiş kayıt", () => {
  it("submitted kayıt SALT-OKUNURDUR ve gerekçesi görünür", () => {
    mockScreen({ entry: entryDetail({ status: "submitted", submitted_at: "2026-07-15T17:30:00Z" }) });
    render(<SiteDiaryEntryView />);

    expect(screen.getByText(/Gönderilmiş kayıt salt-okunurdur\./)).toBeInTheDocument();
    expect(screen.getByLabelText("03.001 bugün yapılan miktar")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Taslak Kaydet" })).not.toBeInTheDocument();
  });

  it("admin seviyesinde 'Yeniden Aç' basılır ve reopen ucunu çağırır", async () => {
    const user = setupUser();
    mockSession({ site_diary: "admin" });
    mockScreen({ entry: entryDetail({ status: "submitted" }) });
    reopenMutate.mockResolvedValue(entryDetail({ status: "draft" }));
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Yeniden Aç" }));

    await waitFor(() => expect(reopenMutate).toHaveBeenCalledTimes(1));
  });

  it("admin OLMAYAN yazma seviyesinde 'Yeniden Aç' basılmaz", () => {
    mockSession({ site_diary: "full" });
    mockScreen({ entry: entryDetail({ status: "submitted" }) });
    render(<SiteDiaryEntryView />);

    expect(screen.queryByRole("button", { name: "Yeniden Aç" })).not.toBeInTheDocument();
    expect(screen.getByText(/Gönderilmiş kayıt salt-okunurdur\./)).toBeInTheDocument();
  });
});

describe("SiteDiaryEntryView · türev kuralları", () => {
  it("Kümülatif ve Hakediş (₺) sütunları YANITTAN basılır (frontend hesaplamaz)", () => {
    mockScreen({ entry: entryDetail() });
    const { container } = render(<SiteDiaryEntryView />);

    // 900 (cumulative_quantity) ve 182.400 (line_amount) yanıttan gelir;
    // 120 × 1.520 çarpımı ekranda YAPILMAZ.
    expect(container.querySelector(".diary-lines__cumulative")?.textContent).toBe("900");
    expect(container.querySelector(".diary-lines__amount")?.textContent).toBe("182.400");
    expect(container.querySelector(".diary-lines__total-amount")?.textContent).toBe("₺ 182.400");
  });

  it("kaydedilmemiş değişiklikte türev sütunları için görünür uyarı çıkar", async () => {
    const user = setupUser();
    mockScreen({ entry: entryDetail() });
    render(<SiteDiaryEntryView />);

    await user.clear(screen.getByLabelText("03.001 bugün yapılan miktar"));
    await user.type(screen.getByLabelText("03.001 bugün yapılan miktar"), "130");

    expect(
      await screen.findByText(/Kaydedilmemiş değişiklik var\./),
    ).toBeInTheDocument();
  });

  it("kayıt açılmadan satır UYDURULMAZ; 'Kaydet & Gönder' gerekçesiyle devre dışıdır", () => {
    mockScreen();
    render(<SiteDiaryEntryView />);

    expect(
      screen.getByText(/İş kalemi satırları, gün için kayıt açıldığında/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet & Gönder" })).toBeDisabled();
  });
});

describe("SiteDiaryEntryView · 409 akışı", () => {
  it("aynı güne ikinci kayıtta Türkçe mesaj + 'Var olan kaydı aç' yolu basılır", async () => {
    const user = setupUser();
    mockScreen();
    createMutate.mockRejectedValue(
      new BackendError(409, { detail: "Bu güne ait günlük kayıt zaten var." }),
    );
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(await screen.findByText("Bu güne ait günlük kayıt zaten var.")).toBeInTheDocument();
    const openExisting = screen.getByRole("button", { name: "Var olan kaydı aç" });

    await user.click(openExisting);

    // Mevcut kayda yönlendirme = ay listesini tazele; hata bandı kapanır.
    await waitFor(() => expect(refetchEntries).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: "Var olan kaydı aç" })).not.toBeInTheDocument();
  });

  it("409 DIŞI hatada yönlendirme butonu basılmaz, hata mesajı görünür", async () => {
    const user = setupUser();
    mockScreen();
    createMutate.mockRejectedValue(new BackendError(500, { detail: "sunucu hatası" }));
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(await screen.findByText("sunucu hatası")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Var olan kaydı aç" })).not.toBeInTheDocument();
  });

  it("geçersiz miktar hücresi ağa ÇIKMADAN durdurulur", async () => {
    const user = setupUser();
    mockScreen({ entry: entryDetail() });
    render(<SiteDiaryEntryView />);

    await user.clear(screen.getByLabelText("03.001 bugün yapılan miktar"));
    await user.type(screen.getByLabelText("03.001 bugün yapılan miktar"), "-5");
    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    expect(
      await screen.findByText("Miktar hücrelerinde geçersiz değer var; düzeltip tekrar deneyin."),
    ).toBeInTheDocument();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(linesMutate).not.toHaveBeenCalled();
  });
});

describe("SiteDiaryEntryView · kaydetme akışı", () => {
  it("kayıt YOKKEN 'Taslak Kaydet' önce kaydı açar (satır iskeleti sunucudan)", async () => {
    const user = setupUser();
    mockScreen();
    createMutate.mockResolvedValue(entryDetail({ entry_date: TODAY }));
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0][0]).toMatchObject({ entry_date: TODAY });
    // Kayıt açma gövdesi satır TAŞIMAZ.
    expect(createMutate.mock.calls[0][0]).not.toHaveProperty("lines");
    expect(linesMutate).not.toHaveBeenCalled();
  });

  it("kayıt VARKEN 'Taslak Kaydet' başlığı PATCH, satırları PUT eder", async () => {
    const user = setupUser();
    const detail = entryDetail({ entry_date: TODAY });
    mockScreen({ entry: detail });
    updateMutate.mockResolvedValue(detail);
    linesMutate.mockResolvedValue(detail);
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Taslak Kaydet" }));

    await waitFor(() => expect(linesMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(linesMutate.mock.calls[0][0]).toEqual({
      lines: [{ boq_item_id: "bi-1", quantity: 120 }],
    });
  });

  it("'Kaydet & Gönder' kaydeder, SONRA submit eder (sıra korunur)", async () => {
    const user = setupUser();
    const detail = entryDetail({ entry_date: TODAY });
    mockScreen({ entry: detail });
    updateMutate.mockResolvedValue(detail);
    linesMutate.mockResolvedValue(detail);
    submitMutate.mockResolvedValue(entryDetail({ status: "submitted" }));
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Kaydet & Gönder" }));

    await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.invocationCallOrder[0]).toBeLessThan(
      submitMutate.mock.invocationCallOrder[0],
    );
    expect(linesMutate.mock.invocationCallOrder[0]).toBeLessThan(
      submitMutate.mock.invocationCallOrder[0],
    );
  });

  it("kaydetme kırılırsa submit HİÇ çağrılmaz", async () => {
    const user = setupUser();
    const detail = entryDetail({ entry_date: TODAY });
    mockScreen({ entry: detail });
    updateMutate.mockRejectedValue(new BackendError(409, { detail: "Gönderilmiş kayıt düzenlenemez." }));
    render(<SiteDiaryEntryView />);

    await user.click(screen.getByRole("button", { name: "Kaydet & Gönder" }));

    expect(await screen.findByText("Gönderilmiş kayıt düzenlenemez.")).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });
});
