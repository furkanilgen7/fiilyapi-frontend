import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SectionForm } from "./SectionForm";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSection } from "@/lib/api/hooks/useSection";
import { useCreateSection, useUpdateSection } from "@/lib/api/hooks/useSectionMutations";
import { useSite } from "@/lib/api/hooks/useSites";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import { BackendError } from "@/lib/api/unwrap";
import { MESSAGES } from "./validate";

vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSection")>()),
  useSection: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSectionMutations", () => ({
  useCreateSection: vi.fn(),
  useUpdateSection: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useUserOptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useUserOptions")>()),
  useUserOptions: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "22222222-2222-2222-2222-222222222222";
const SECTION_ID = "33333333-3333-3333-3333-333333333333";
const MANAGER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NEW_SECTION_ID = "44444444-4444-4444-4444-444444444444";

const BASE_ME = {
  id: "user-0",
  email: "ayse@ornek.com",
  full_name: "Ayşe Yılmaz",
  title: null,
  role_key: "site_manager",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

const SITE = {
  id: SITE_ID,
  name: "A-Blok Şantiyesi",
  section_count: 5,
  project: { id: PROJECT_ID, name: "Güneşkent Konut", city: "Ankara", employer_name: null },
} as never;

const PROJECT = { id: PROJECT_ID, name: "Güneşkent Konut", code: "SZL-2025-001" } as never;

const PLACEHOLDER = { available: false, value: null, pending_module: "boq" };
const COUNT_PLACEHOLDER = { available: false, count: null, pending_module: "boq" };

const SECTION_DETAIL = {
  id: SECTION_ID,
  site_id: SITE_ID,
  code: "BLM-06",
  name: "Kat 11–14 Kaba İnşaat",
  status: "active",
  manager_user_id: MANAGER_ID,
  manager_name: "Sercan Öztürk",
  deputy_manager_user_id: null,
  deputy_manager_name: null,
  start_date: "2026-10-01",
  end_date: "2027-03-31",
  sort_order: 6,
  section_type: "structural",
  description: "Kat 11–14 arası betonarme, kalıp ve demir imalatı.",
  planned_worker_count: 42,
  budget_amount: "2840000",
  is_draft: false,
  progress_pct: PLACEHOLDER,
  boq_item_count: COUNT_PLACEHOLDER,
  budget: PLACEHOLDER,
  worker_count: COUNT_PLACEHOLDER,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as never;

function queryResult<T>(value: Partial<{ data: T; isLoading: boolean; isError: boolean; error: unknown }>) {
  return { data: undefined, isLoading: false, isError: false, error: null, ...value } as never;
}

function mockUsers(overrides: Record<string, unknown> = {}) {
  vi.mocked(useUserOptions).mockReturnValue({
    options: [{ id: MANAGER_ID, full_name: "Sercan Öztürk", title: "Şantiye Şefi" }],
    isForbidden: false,
    isLoading: false,
    isError: false,
    ...overrides,
  } as never);
}

const createMutate = vi.fn();
const updateMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockSession({ sites: "full" });
  vi.mocked(useSite).mockReturnValue(queryResult({ data: SITE }));
  vi.mocked(useProject).mockReturnValue(queryResult({ data: PROJECT }));
  vi.mocked(useSection).mockReturnValue(queryResult({ data: undefined }));
  vi.mocked(useCreateSection).mockReturnValue({ mutate: createMutate, isPending: false } as never);
  vi.mocked(useUpdateSection).mockReturnValue({ mutate: updateMutate, isPending: false } as never);
  mockUsers();
});

function renderCreate() {
  return render(<SectionForm mode="create" projectId={PROJECT_ID} siteId={SITE_ID} />);
}

function renderEdit() {
  vi.mocked(useSection).mockReturnValue(queryResult({ data: SECTION_DETAIL }));
  return render(<SectionForm mode="edit" projectId={PROJECT_ID} siteId={SITE_ID} sectionId={SECTION_ID} />);
}

describe("SectionForm — izin", () => {
  it("sites:full yoksa AccessDenied basar", () => {
    mockSession({ sites: "view" });
    renderCreate();
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("SectionForm — create kipi kabuk (F35-60)", () => {
  it("kırıntı yolu + başlık + bağlam kutusu basar", () => {
    renderCreate();
    const nav = screen.getByRole("navigation", { name: "Kırıntı yolu" });
    expect(within(nav).getByText("A-Blok Şantiyesi")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeInTheDocument();
    const info = screen.getByTestId("section-form-site-info");
    expect(info).toHaveTextContent("Şantiye:");
    expect(info).toHaveTextContent("A-Blok Şantiyesi · Güneşkent Konut (SZL-2025-001)");
    expect(info).toHaveTextContent("Mevcut 5 bölüm var.");
  });

  it("Şantiye alanı kilitlidir ve rotadan gelen şantiye adını basar", () => {
    renderCreate();
    expect(screen.getByLabelText("Şantiye")).toHaveValue("A-Blok Şantiyesi");
    expect(screen.getByLabelText("Şantiye")).toBeDisabled();
  });

  it("devre dışı kartlar render edilir ve kontrolleri disabled'dır", () => {
    renderCreate();
    expect(screen.getByRole("button", { name: "+ Poz Seç" })).toBeDisabled();
    expect(screen.getByText("Bu bölüme henüz iş kalemi atanmadı — iş kalemi bağları ile birlikte gelir.")).toBeInTheDocument();
    // final review M1: F194-201 satır-butonu da basılmalı, devre dışı.
    expect(screen.getByRole("button", { name: "Şantiye kotasından poz seç" })).toBeDisabled();
    const gantt = screen.getByLabelText("Bölümü proje takvimine (Gantt) otomatik ekle");
    expect(gantt).toBeDisabled();
    expect(gantt).toBeChecked();
  });
});

/** Alt eylem şeridindeki butonu tıklar — topbar'daki aynı isimli butonla çakışmaz. */
function clickFooterAction(user: ReturnType<typeof userEvent.setup>, name: string) {
  const strip = document.querySelector(".pf-actions") as HTMLElement;
  return user.click(within(strip).getByRole("button", { name }));
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Bölüm Adı"), "Kat 11–14 Kaba İnşaat");
  await user.selectOptions(screen.getByLabelText("Bölüm Tipi"), "structural");
  await user.selectOptions(screen.getByLabelText("Bölüm Sorumlusu"), MANAGER_ID);
  fireEvent.change(screen.getByLabelText("Başlangıç Tarihi"), { target: { value: "2026-10-01" } });
  fireEvent.change(screen.getByLabelText("Planlanan Bitiş"), { target: { value: "2027-03-31" } });
  await user.type(screen.getByLabelText("Bölüm Bedeli (₺)"), "2840000");
}

describe("SectionForm — taslak / taslak dışı ayrımı", () => {
  it("Taslak Kaydet'te yalnız ad ile mutate çağrılır, is_draft: true", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.type(screen.getByLabelText("Bölüm Adı"), "Temel");
    await clickFooterAction(user, "Taslak Kaydet");

    expect(createMutate).toHaveBeenCalledTimes(1);
    const [body] = createMutate.mock.calls[0];
    expect(body.is_draft).toBe(true);
    expect(body.name).toBe("Temel");
  });

  it("Bölümü Oluştur'da eksik zorunlu alanlar hata gösterir, mutate ÇAĞRILMAZ", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.type(screen.getByLabelText("Bölüm Adı"), "Temel");
    await clickFooterAction(user, "Bölümü Oluştur");

    expect(screen.getAllByText(MESSAGES.sectionTypeRequired).length).toBeGreaterThan(0);
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("taslakta tarih sırası tersse hata verir (tutarlılık her zaman uygulanır)", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.type(screen.getByLabelText("Bölüm Adı"), "Temel");
    fireEvent.change(screen.getByLabelText("Başlangıç Tarihi"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("Planlanan Bitiş"), { target: { value: "2026-04-01" } });
    await clickFooterAction(user, "Taslak Kaydet");

    expect(screen.getAllByText(MESSAGES.endBeforeStart).length).toBeGreaterThan(0);
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("tüm zorunlu alanlar doluysa Bölümü Oluştur mutate çağırır, is_draft: false", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillRequired(user);
    await clickFooterAction(user, "Bölümü Oluştur");

    expect(createMutate).toHaveBeenCalledTimes(1);
    const [body, opts] = createMutate.mock.calls[0];
    expect(body).toMatchObject({
      name: "Kat 11–14 Kaba İnşaat",
      section_type: "structural",
      manager_user_id: MANAGER_ID,
      start_date: "2026-10-01",
      end_date: "2027-03-31",
      budget_amount: 2840000,
      is_draft: false,
    });

    act(() => opts.onSuccess({ id: NEW_SECTION_ID }));
    expect(pushMock).toHaveBeenCalledWith(
      `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/bolumler/${NEW_SECTION_ID}`,
    );
  });

  it("bütçe '0' iken geçerlidir ve gönderilir", async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.type(screen.getByLabelText("Bölüm Adı"), "Temel");
    await user.selectOptions(screen.getByLabelText("Bölüm Tipi"), "structural");
    await user.selectOptions(screen.getByLabelText("Bölüm Sorumlusu"), MANAGER_ID);
    fireEvent.change(screen.getByLabelText("Başlangıç Tarihi"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Planlanan Bitiş"), { target: { value: "2027-03-31" } });
    await user.type(screen.getByLabelText("Bölüm Bedeli (₺)"), "0");
    await clickFooterAction(user, "Bölümü Oluştur");

    expect(screen.queryByText(MESSAGES.budgetRequired)).not.toBeInTheDocument();
    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0].budget_amount).toBe(0);
  });
});

describe("SectionForm — 409 kod çakışması", () => {
  it("Bölüm Kodu alanının altında Türkçe hata gösterir, TAM OLARAK BİR KEZ, genel banner BASILMAZ", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillRequired(user);
    await user.type(screen.getByLabelText("Bölüm Kodu"), "BLM-01");
    await clickFooterAction(user, "Bölümü Oluştur");

    const [, opts] = createMutate.mock.calls[0];
    act(() => opts.onError(new BackendError(409, { detail: "duplicate key value" })));

    const codeField = screen.getByLabelText("Bölüm Kodu");
    expect(codeField).toHaveAttribute("aria-invalid", "true");
    // Brief §409: YALNIZ alan hatası — genel banner (role="alert", .pf-form-error) BASILMAZ.
    expect(screen.getAllByText(MESSAGES.sectionCodeConflict)).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector(".pf-form-error")).not.toBeInTheDocument();
  });
});

describe("SectionForm — edit kipi", () => {
  it("mevcut bölümden alanları doldurur", () => {
    renderEdit();
    expect(screen.getByLabelText("Bölüm Adı")).toHaveValue("Kat 11–14 Kaba İnşaat");
    expect(screen.getByLabelText("Bölüm Kodu")).toHaveValue("BLM-06");
    expect(screen.getByLabelText("Bölüm Sorumlusu")).toHaveValue(MANAGER_ID);
    expect(screen.getByLabelText("Bölüm Bedeli (₺)")).toHaveValue(2840000);
  });

  it("kaydedince updateSection çağrılır ve bölüm detayına yönlendirir", async () => {
    const user = userEvent.setup();
    renderEdit();
    await clickFooterAction(user, "Kaydet");

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const [, opts] = updateMutate.mock.calls[0];
    act(() => opts.onSuccess({ id: SECTION_ID }));
    expect(pushMock).toHaveBeenCalledWith(`/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/bolumler/${SECTION_ID}`);
  });

  // final review I3: detay sorgusu 403 DIŞI bir hatayla (404/500) başarısız
  // olursa `isLoading:false` + `data:undefined` olur — düzeltmeden önce ekran
  // kalıcı "Yükleniyor…" mesajında donuyordu.
  it("detay sorgusu hata verirse (403 dışı) 'Bölüm yüklenemedi' basar, sonsuz yüklenmede kalmaz", () => {
    vi.mocked(useSection).mockReturnValue(
      queryResult({ data: undefined, isLoading: false, isError: true, error: new Error("500") }),
    );
    render(<SectionForm mode="edit" projectId={PROJECT_ID} siteId={SITE_ID} sectionId={SECTION_ID} />);

    expect(screen.getByText("Bölüm yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });

  // final review I1: sec-2 senaryosu (mock-backend.ts) — `manager_user_id`
  // null, `manager_name` "M. Arslan" dolu (eski, serbest-metin sorumlulu
  // kayıt). Form bu alanı yazmaz ama zorunluluk düşmeli — kullanıcı hiçbir
  // şeyi değiştirmeden "Kaydet"e basabilmeli.
  it("mevcut kayıtta manager_user_id null ama manager_name doluysa (eski kayıt) sorumlu zorunlu değildir", async () => {
    const user = userEvent.setup();
    vi.mocked(useSection).mockReturnValue(
      queryResult({
        data: { ...(SECTION_DETAIL as Record<string, unknown>), manager_user_id: null, manager_name: "M. Arslan" },
      }),
    );
    render(<SectionForm mode="edit" projectId={PROJECT_ID} siteId={SITE_ID} sectionId={SECTION_ID} />);

    await clickFooterAction(user, "Kaydet");

    expect(screen.queryByText(MESSAGES.managerRequired)).not.toBeInTheDocument();
    expect(updateMutate).toHaveBeenCalledTimes(1);
  });
});
