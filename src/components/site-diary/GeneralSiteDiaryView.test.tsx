import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GeneralSiteDiaryView } from "./GeneralSiteDiaryView";
import { useSession } from "@/components/shell/SessionProvider";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
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
import type { MeResponse } from "@/lib/auth/types";

/**
 * F-NAVSAHA · `/gunluk-kayit` ekranının KENDİ davranışları. Ortak gövde
 * (`DiaryEntryScreen`) şantiye rotasının 456 satırlık dosyasında ölçülür;
 * buradaki iddialar kök ekranın ŞANTİYE ROTASINDAN AYRILDIĞI yerlere
 * odaklanır: şantiye seçici, `?site=` URL durumu, ilk-seçenek varsayılanı,
 * boş liste gerekçesi ve drill sekme şeridinin YOKLUĞU (E7).
 */

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/gunluk-kayit",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteOptions", () => ({ useSiteOptions: vi.fn() }));
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
  role_key: "site_chief",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions: Record<string, string>) {
  vi.mocked(useSession).mockReturnValue({
    me: { ...BASE_ME, permissions } as MeResponse,
    isLoading: false,
  });
}

const OPTIONS = [
  { siteId: "s-1", projectId: "p-1", label: "Güneşkent A-Blok" },
  { siteId: "s-2", projectId: "p-2", label: "Çelik OSB Fabrika" },
];

function mockOptions(
  options: typeof OPTIONS = OPTIONS,
  state: { isLoading?: boolean; isError?: boolean } = {},
) {
  vi.mocked(useSiteOptions).mockReturnValue({
    options,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  });
}

function mockMutation() {
  return { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  mockSession({ site_diary: "full", progress_payments: "view" });
  mockOptions();
  vi.mocked(useSiteDiaryEntries).mockReturnValue({
    data: { items: [], total: 0, limit: 50, offset: 0 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useSiteDiaryEntry).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSite).mockReturnValue({
    data: {
      id: "s-1",
      name: "A-Blok Şantiyesi",
      project: { id: "p-1", name: "Güneşkent" },
      sections: [],
    },
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
  vi.mocked(useCreateSiteDiaryEntry).mockReturnValue(mockMutation());
  vi.mocked(useUpdateSiteDiaryEntry).mockReturnValue(mockMutation());
  vi.mocked(useSaveSiteDiaryLines).mockReturnValue(mockMutation());
  vi.mocked(useSubmitSiteDiaryEntry).mockReturnValue(mockMutation());
  vi.mocked(useReopenSiteDiaryEntry).mockReturnValue(mockMutation());
});

describe("GeneralSiteDiaryView · şantiye seçici", () => {
  it("ekran gercekten basilir (ComingSoon DEGIL)", () => {
    render(<GeneralSiteDiaryView />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Günlük Kayıt & Planlama" }),
    ).toBeInTheDocument();
  });

  it("secici TUM santiye secenekleriyle dolar (E5 98 deseni)", () => {
    render(<GeneralSiteDiaryView />);
    const select = screen.getByLabelText("Şantiye");
    expect(
      [...select.querySelectorAll("option")].map((o) => o.textContent),
    ).toEqual(["Güneşkent A-Blok", "Çelik OSB Fabrika"]);
  });

  it("URL'de ?site= yokken ILK secenek secilidir", () => {
    render(<GeneralSiteDiaryView />);
    expect(screen.getByLabelText("Şantiye")).toHaveValue("s-1");
    // Ortak gövde o şantiyenin kimliğiyle beslenir.
    expect(vi.mocked(useSite)).toHaveBeenCalledWith("s-1", { project: "p-1" });
  });

  it("?site= URL'den okunur ve ortak govdeye O santiye gecirilir", () => {
    searchParams = new URLSearchParams({ site: "s-2" });
    render(<GeneralSiteDiaryView />);
    expect(screen.getByLabelText("Şantiye")).toHaveValue("s-2");
    expect(vi.mocked(useSite)).toHaveBeenCalledWith("s-2", { project: "p-2" });
  });

  /**
   * 🔴 URL BILINMEYEN BIR SANTIYE TASIYABILIR (elle yazilmis/bayat baglanti).
   * O deger ortak govdeye GECIRILSEYDI `useSite` 404'e gider ve ekran sessizce
   * bos kalirdi; secici de hicbir secenege denk dusmeyen bir degeri gosterip
   * BOS gorunurdu. Bilinmeyen deger ilk secenege duser.
   */
  it("URL'deki BILINMEYEN santiye ilk secenege duser (sessiz bos ekran YOK)", () => {
    searchParams = new URLSearchParams({ site: "yok-boyle-bir-santiye" });
    render(<GeneralSiteDiaryView />);
    expect(screen.getByLabelText("Şantiye")).toHaveValue("s-1");
    expect(vi.mocked(useSite)).toHaveBeenCalledWith("s-1", { project: "p-1" });
  });

  it("secim URL'e yazilir (paylasilabilir baglanti, yol ELLE kurulmaz)", async () => {
    const user = userEvent.setup();
    render(<GeneralSiteDiaryView />);
    await user.selectOptions(screen.getByLabelText("Şantiye"), "s-2");
    expect(replace).toHaveBeenCalledWith("/gunluk-kayit?site=s-2", { scroll: false });
  });

  it("santiye YOKKEN secici devre disi ve GEREKCE yazilir", () => {
    mockOptions([]);
    render(<GeneralSiteDiaryView />);
    expect(screen.getByLabelText("Şantiye")).toBeDisabled();
    expect(screen.getByText("Kayıt girilebilecek şantiye bulunmuyor.")).toBeInTheDocument();
  });

  it("liste YUKLENIRKEN gerekce 'Yukleniyor' olur (hata sanilmaz)", () => {
    mockOptions([], { isLoading: true });
    render(<GeneralSiteDiaryView />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(
      screen.queryByText("Kayıt girilebilecek şantiye bulunmuyor."),
    ).not.toBeInTheDocument();
  });

  it("liste HATALIYSA gerekce hatayi soyler (bos liste sanilmaz)", () => {
    mockOptions([], { isError: true });
    render(<GeneralSiteDiaryView />);
    expect(screen.getByText("Şantiye listesi yüklenemedi.")).toBeInTheDocument();
  });
});

describe("GeneralSiteDiaryView · kabuk farki (E7)", () => {
  /**
   * 🔴 E7 ANA KABUKTA ciziliir ve santiye DRILL sekme seridi YOKTUR (E7 30-60);
   * seridi yalniz santiye kapsamli ikiz (GK148-155) cizer. Serit burada
   * basilsaydi kullanici kok rotadayken santiye detayina ait sekmeler gorur ve
   * tiklayinca baska bir kabuga savrulurdu.
   */
  it("santiye drill sekme seridi BASILMAZ", () => {
    render(<GeneralSiteDiaryView />);
    expect(
      screen.queryByRole("tablist", { name: "Şantiye detay sekmeleri" }),
    ).not.toBeInTheDocument();
  });

  /**
   * 🔴 POZITIF KONTROL — yukaridaki iddia, ekran HIC basilmasa da (ornegin
   * bilesen bos donse) yesil kalirdi. Seridin yoklugunun "ekran yok"tan degil
   * KABUK FARKINDAN geldigi ayrica olculur: govdenin kendi serit-disi
   * parcalari basiliyor.
   */
  it("kontrol: serit yok ama EKRANIN KENDISI basiliyor", () => {
    render(<GeneralSiteDiaryView />);
    expect(screen.getByLabelText("Şantiye")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Günlük Kayıt & Planlama",
    );
  });

  it("izin yoksa ortak govde erisim reddi basar (secici de gorunmez)", () => {
    mockSession({ site_diary: "none" });
    render(<GeneralSiteDiaryView />);
    expect(screen.queryByRole("heading", { level: 1, name: "Günlük Kayıt & Planlama" })).not.toBeInTheDocument();
  });
});
