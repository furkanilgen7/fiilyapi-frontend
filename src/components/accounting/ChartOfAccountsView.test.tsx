import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import { useSession } from "@/components/shell/SessionProvider";
import type {
  ChartAccountListResponse,
  ChartAccountResponse,
} from "@/lib/api/hooks/useChartOfAccounts";
import { useChartOfAccounts } from "@/lib/api/hooks/useChartOfAccounts";
import type {
  ChartAccountCreate,
  ChartAccountUpdateVariables,
} from "@/lib/api/hooks/useChartOfAccountMutations";
import {
  useCreateChartAccount,
  useDeleteChartAccount,
  useUpdateChartAccount,
} from "@/lib/api/hooks/useChartOfAccountMutations";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

import { ChartOfAccountsView } from "./ChartOfAccountsView";

vi.mock("@/lib/api/hooks/useChartOfAccounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useChartOfAccounts")>()),
  useChartOfAccounts: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useChartOfAccountMutations", () => ({
  useCreateChartAccount: vi.fn(),
  useUpdateChartAccount: vi.fn(),
  useDeleteChartAccount: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const ACCOUNTS: ChartAccountResponse[] = [
  // HP:71-73 — grup
  band("10", "Hazır Değerler", { level: 1, class_code: "1", balance: "0.00" }),
  // HP:76-80 — ana hesap (level 2), TAM veri satırı
  band("100", "Kasa", { level: 2, class_code: "1", balance: "284800.00" }),
  // HP:152-156 — Pasif TÜRÜ + negatif bakiye + KULLANIMDA
  band("257", "Birikmiş Amortismanlar (-)", {
    level: 2,
    class_code: "2",
    account_type: "liability",
    balance: "-620000.00",
  }),
  // HP:164-168 — Pasif TÜRÜ, POZİTİF bakiye ama KIRMIZI
  band("320", "Satıcılar", {
    level: 2,
    class_code: "3",
    account_type: "liability",
    balance: "2184000.00",
  }),
  // Mockup'ta ÇİZİLMEMİŞ sınıf + kaldırılmış hesap
  band("900", "Nazım Hesap", {
    level: 2,
    class_code: "9",
    account_type: "asset",
    is_active: false,
    balance: "0.00",
  }),
];

function band(
  code: string,
  name: string,
  extra: Partial<ChartAccountResponse>,
): ChartAccountResponse {
  return {
    id: `id-${code}`,
    code,
    name,
    account_type: "asset",
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    balance: "0.00",
    class_code: code[0] ?? "1",
    level: 2,
    ...extra,
  };
}

function listResponse(
  items: ChartAccountResponse[],
  total = items.length,
): ChartAccountListResponse {
  return { items, total, limit: 200, offset: 0 };
}

const updateMutate = vi.fn();
const deleteMutate = vi.fn();
/** Diyalog `mutateAsync` kullanır (iki adımlı yazmada sıra gerekir). */
const createAsync = vi.fn();
const updateAsync = vi.fn();

function queryResult(partial: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    ...partial,
  } as unknown as UseQueryResult<ChartAccountListResponse, Error>;
}

function setSession(level: string | undefined) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: level === undefined ? {} : { accounting: level } } as unknown as MeResponse,
  } as unknown as ReturnType<typeof useSession>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession("full");
  createAsync.mockResolvedValue(undefined);
  updateAsync.mockResolvedValue(undefined);
  vi.mocked(useCreateChartAccount).mockReturnValue({
    mutateAsync: createAsync,
    isPending: false,
  } as unknown as UseMutationResult<ChartAccountResponse, Error, ChartAccountCreate>);
  vi.mocked(useUpdateChartAccount).mockReturnValue({
    mutate: updateMutate,
    mutateAsync: updateAsync,
    isPending: false,
  } as unknown as UseMutationResult<ChartAccountResponse, Error, ChartAccountUpdateVariables>);
  vi.mocked(useDeleteChartAccount).mockReturnValue({
    mutate: deleteMutate,
  } as unknown as UseMutationResult<void, Error, string>);
  vi.mocked(useChartOfAccounts).mockReturnValue(queryResult({ data: listResponse(ACCOUNTS) }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Hesap Planı ekranı — HP başlık şeridi", () => {
  it("breadcrumb `← Muhasebe` (HP:41) ve başlık (HP:43) basılır", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-back")).toHaveAttribute("href", "/muhasebe");
    expect(screen.getByRole("heading", { name: "Hesap Planı" })).toBeInTheDocument();
  });

  it("HP:49 `Excel` devre dışıdır ve gerekçesi EKRANDA görünür", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-export")).toBeDisabled();
    expect(screen.getByTestId("hp-export-reason")).toHaveTextContent(
      "Hesap planı dışa aktarma ucu henüz açılmadı",
    );
  });

  it("HP:50 `+ Hesap Ekle` GERÇEK diyaloğu OLUŞTURMA kipinde açar", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-create"));
    expect(screen.getByRole("dialog", { name: "Yeni Hesap" })).toBeInTheDocument();
    // Boş formda kaydet KAPALIdır ve gerekçesi EKRANDA görünür.
    expect(screen.getByTestId("hp-dialog-save")).toBeDisabled();
    expect(screen.getByTestId("hp-dialog-blockers")).toHaveTextContent("Hesap kodu zorunludur.");
    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("satır `Düzenle` aynı diyaloğu DÜZENLEME kipinde ve DOLU açar", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-edit-100"));
    expect(screen.getByRole("dialog", { name: "Hesap Düzenle" })).toBeInTheDocument();
    expect(screen.getByTestId("hp-dialog-code")).toHaveValue("100");
    expect(screen.getByTestId("hp-dialog-name")).toHaveValue("Kasa");
  });

  it("yazma yetkisi yoksa `+ Hesap Ekle` kapalıdır ve gerekçe basılır", () => {
    setSession("view");
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-create")).toBeDisabled();
    expect(screen.getByTestId("hp-write-notice")).toBeInTheDocument();
  });
});

describe("arama (HP:45-48)", () => {
  it("debounce sonrası `q` SUNUCUYA gider (istemcide süzme YOK)", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.type(screen.getByTestId("hp-search"), "kasa");
    await waitFor(() => {
      expect(vi.mocked(useChartOfAccounts)).toHaveBeenCalledWith(
        expect.objectContaining({ q: "kasa" }),
      );
    });
  });

  it("boş arama `q` GÖNDERMEZ (süzgeç değildir)", () => {
    render(<ChartOfAccountsView />);
    expect(vi.mocked(useChartOfAccounts)).toHaveBeenCalledWith({ limit: 200 });
  });
});

describe("tablo — hiyerarşi ve bantlar", () => {
  it("SINIF bantları class_code'a göre açılır, dördü mockup metniyle", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-class-1")).toHaveTextContent("SINIF 1 — DÖNEN VARLIKLAR");
    expect(screen.getByTestId("hp-class-2")).toHaveTextContent("SINIF 2 — DURAN VARLIKLAR");
    expect(screen.getByTestId("hp-class-3")).toHaveTextContent(
      "SINIF 3 — KISA VADELİ YÜKÜMLÜLÜKLER",
    );
  });

  it("🔴 çizilmemiş sınıfta başlık İCAT EDİLMEZ", () => {
    render(<ChartOfAccountsView />);
    const band = screen.getByTestId("hp-class-9");
    expect(band).toHaveTextContent("SINIF 9");
    expect(band.textContent).not.toContain("—");
    expect(band.closest("tr")).toHaveClass("mu-chart__class--neutral");
  });

  it("`level === 1` grup satırıdır, `level === 2` TAM veri satırı (HP:73 vs HP:76)", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-group-10")).toBeInTheDocument();
    // Grup satırında Tür/Bakiye/Durum YOKTUR.
    expect(screen.queryByTestId("hp-balance-10")).toBeNull();
    // HP:76'daki `100` grup DEĞİL: üç sütunu da taşır.
    expect(screen.getByTestId("hp-type-100")).toBeInTheDocument();
    expect(screen.getByTestId("hp-balance-100")).toBeInTheDocument();
    expect(screen.getByTestId("hp-status-100")).toBeInTheDocument();
  });
});

describe("🔴 Tür ile Durum ekranda AYRI sütunlardır", () => {
  it("`Pasif` TÜRÜNDEKİ hesabın durumu KULLANIMDA olabilir (HP:154 vs HP:156)", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-type-257")).toHaveTextContent("Pasif");
    expect(screen.getByTestId("hp-status-257")).toHaveAttribute("aria-label", "Kullanımda");
    expect(screen.getByTestId("hp-status-257")).toHaveClass("mu-chart__dot--on");
  });

  it("kaldırılmış hesabın TÜRÜ `Aktif` ama noktası GRİdir", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-type-900")).toHaveTextContent("Aktif");
    expect(screen.getByTestId("hp-status-900")).toHaveAttribute("aria-label", "Kullanım dışı");
    expect(screen.getByTestId("hp-status-900")).toHaveClass("mu-chart__dot--off");
  });
});

describe("bakiye sütunu", () => {
  it("HP:155 — negatif bakiye PARANTEZ içinde ve kırmızı", () => {
    render(<ChartOfAccountsView />);
    const cell = screen.getByTestId("hp-balance-257");
    expect(cell).toHaveTextContent("(620.000)");
    expect(cell.textContent).not.toContain("-");
    expect(cell).toHaveClass("mu-chart__balance--danger");
  });

  it("HP:79 — pozitif varlık bakiyesi yeşil", () => {
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-balance-100")).toHaveClass("mu-chart__balance--success");
  });

  it("HP:167 — pozitif PASİF bakiyesi kırmızıdır (mockup'ın kendi kuralı)", () => {
    render(<ChartOfAccountsView />);
    const cell = screen.getByTestId("hp-balance-320");
    expect(cell).toHaveTextContent("2.184.000");
    expect(cell).toHaveClass("mu-chart__balance--danger");
  });
});

describe("satır eylemleri (yönetim kararı 3)", () => {
  it("birincil eylem PASİFLEŞTİRMEdir: PATCH {is_active:false}", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-deactivate-100"));
    expect(updateMutate).toHaveBeenCalledWith(
      { accountId: "id-100", body: { is_active: false } },
      expect.anything(),
    );
  });

  it("zaten pasif hesapta `Pasifleştir` SUNULMAZ", () => {
    render(<ChartOfAccountsView />);
    expect(screen.queryByTestId("hp-deactivate-900")).toBeNull();
  });

  it("silme yalnız yetkili yüzeydedir (`full` seviyesi göremez)", () => {
    render(<ChartOfAccountsView />);
    expect(screen.queryByTestId("hp-delete-100")).toBeNull();
  });

  it("admin silme düğmesini görür ve 409 ZARİFÇE basılır (ham hata yok)", async () => {
    setSession("admin");
    deleteMutate.mockImplementation((_id: string, opts: { onError: (e: Error) => void }) => {
      opts.onError(
        new BackendError(409, {
          detail: "Bu hesaba bağlı yevmiye kayıtları var; hesap silinemez",
        }),
      );
    });
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-delete-100"));
    expect(screen.getByTestId("hp-action-error")).toHaveTextContent(
      "Bu hesaba bağlı yevmiye kayıtları var; hesap silinemez",
    );
  });
});

describe("kırpılma / boş / hata / yükleniyor", () => {
  it("`total > items.length` ise GÖRÜNÜR sınır bandı basılır", () => {
    vi.mocked(useChartOfAccounts).mockReturnValue(
      queryResult({ data: listResponse(ACCOUNTS, 260) }),
    );
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-truncation")).toHaveTextContent("liste eksik");
  });

  it("tam liste geldiğinde bant BASILMAZ", () => {
    render(<ChartOfAccountsView />);
    expect(screen.queryByTestId("hp-truncation")).toBeNull();
  });

  it("yükleniyor satırı görünür", () => {
    vi.mocked(useChartOfAccounts).mockReturnValue(queryResult({ isLoading: true }));
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-loading")).toBeInTheDocument();
  });

  it("hata satırı sunucunun Türkçe metnini basar", () => {
    vi.mocked(useChartOfAccounts).mockReturnValue(
      queryResult({
        isError: true,
        error: new BackendError(500, { detail: "Sunucu hatası" }),
      }),
    );
    render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-error")).toHaveTextContent("Sunucu hatası");
  });

  it("boş plan ve boş ARAMA sonucu FARKLI metinler basar", async () => {
    vi.mocked(useChartOfAccounts).mockReturnValue(queryResult({ data: listResponse([]) }));
    const { rerender } = render(<ChartOfAccountsView />);
    expect(screen.getByTestId("hp-empty")).toHaveTextContent("Hesap planı boş");
    const user = userEvent.setup();
    await user.type(screen.getByTestId("hp-search"), "zzz");
    rerender(<ChartOfAccountsView />);
    await waitFor(() => {
      expect(screen.getByTestId("hp-empty")).toHaveTextContent("Aramanızla eşleşen hesap yok");
    });
  });

  it("403'te erişim reddi ekranı gösterilir", () => {
    vi.mocked(useChartOfAccounts).mockReturnValue(
      queryResult({ isError: true, error: new BackendError(403, { detail: "yok" }) }),
    );
    const { container } = render(<ChartOfAccountsView />);
    expect(within(container).queryByRole("heading", { name: "Hesap Planı" })).toBeNull();
  });
});

/**
 * T4 · Hesap Ekle/Düzenle diyaloğu. Form mockup'ı YOKTUR (S-FRM kanonu):
 * alanlar `ChartAccountCreate`ten birebir türer ve DÖRTTÜR.
 */
describe("Hesap diyaloğu (T4)", () => {
  it("oluşturma: gövde DÖRT alandır, türev alan SIZMAZ", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-create"));

    await user.type(screen.getByTestId("hp-dialog-code"), "120.01");
    await user.type(screen.getByTestId("hp-dialog-name"), "Alıcılar");
    await user.selectOptions(screen.getByTestId("hp-dialog-type"), "liability");
    await user.click(screen.getByTestId("hp-dialog-save"));

    expect(createAsync).toHaveBeenCalledWith({
      code: "120.01",
      name: "Alıcılar",
      account_type: "liability",
      is_active: true,
    });
    // `balance`/`class_code`/`level` gövdeye GİREMEZ (sunucuda 422).
    const [body] = createAsync.mock.calls[0] as [Record<string, unknown>];
    for (const derived of ["balance", "class_code", "level", "id"]) {
      expect(body).not.toHaveProperty(derived);
    }
  });

  /** 🔴 MUTASYON KANITI: kod biçimi bozulunca kaydet KAPANIR ve istek ATILMAZ. */
  it("biçimi bozuk kodda kaydet KAPALIdır ve ağa çıkılmaz", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-create"));

    await user.type(screen.getByTestId("hp-dialog-code"), "1000");
    await user.type(screen.getByTestId("hp-dialog-name"), "Kasa");
    expect(screen.getByTestId("hp-dialog-save")).toBeDisabled();
    expect(screen.getByTestId("hp-dialog-blockers")).toHaveTextContent(
      "100.01 biçiminde olmalıdır",
    );

    await user.clear(screen.getByTestId("hp-dialog-code"));
    await user.type(screen.getByTestId("hp-dialog-code"), "100");
    expect(screen.getByTestId("hp-dialog-save")).toBeEnabled();
    expect(createAsync).not.toHaveBeenCalled();
  });

  it("düzenleme: yalnız DEĞİŞEN alan PATCH'lenir", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-edit-100"));

    await user.clear(screen.getByTestId("hp-dialog-name"));
    await user.type(screen.getByTestId("hp-dialog-name"), "Merkez Kasa");
    await user.click(screen.getByTestId("hp-dialog-save"));

    expect(updateAsync).toHaveBeenCalledWith({
      accountId: "id-100",
      body: { name: "Merkez Kasa" },
    });
  });

  it("hiçbir alan değişmediyse istek ATILMAZ, diyalog kapanır", async () => {
    const user = userEvent.setup();
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-edit-100"));
    await user.click(screen.getByTestId("hp-dialog-save"));

    expect(updateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("🔴 sunucu hatası TÜRKÇE cümleyle basılır; ham gövde EKRANA ÇIKMAZ", async () => {
    const user = userEvent.setup();
    createAsync.mockRejectedValue(
      new BackendError(409, { detail: "Bu hesap kodu zaten kayıtlı" }),
    );
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-create"));
    await user.type(screen.getByTestId("hp-dialog-code"), "100");
    await user.type(screen.getByTestId("hp-dialog-name"), "Kasa");
    await user.click(screen.getByTestId("hp-dialog-save"));

    const error = await screen.findByTestId("hp-dialog-error");
    expect(error).toHaveTextContent("Bu hesap kodu zaten kayıtlı");
    expect(error.textContent).not.toContain("{");
    // Diyalog AÇIK kalır: kullanıcı doldurduğu formu kaybetmez.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("🔴 `detail` STRING değilse ham nesne basılmaz, Türkçe yedeğe düşer", async () => {
    const user = userEvent.setup();
    createAsync.mockRejectedValue(
      new BackendError(422, { detail: [{ loc: ["body", "code"], type: "string_pattern" }] }),
    );
    render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-create"));
    await user.type(screen.getByTestId("hp-dialog-code"), "100");
    await user.type(screen.getByTestId("hp-dialog-name"), "Kasa");
    await user.click(screen.getByTestId("hp-dialog-save"));

    const error = await screen.findByTestId("hp-dialog-error");
    expect(error).toHaveTextContent("Hesap oluşturulamadı.");
    expect(error.textContent).not.toContain("string_pattern");
  });

  /**
   * 🔴 T7 BULGUSU (mutasyon hayatta kalmıştı): düzenlenecek satır bu arada
   * listeden düşerse (arama daraldı, sayfa kaydı, başka biri sildi) diyalog
   * OLUŞTURMA kipine SESSİZCE KAYMAMALIDIR — kullanıcı "Kasa"yı düzenlediğini
   * sanarken ikinci bir hesap yaratırdı. `ChartAccountDialogHost` bunun için
   * yazılmıştı ama hiçbir test onu ölçmüyordu.
   */
  it("🔴 düzenlenen satır listeden DÜŞERSE oluşturma kipine kaymaz, gerekçe basılır", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ChartOfAccountsView />);
    await user.click(screen.getByTestId("hp-edit-100"));
    expect(screen.getByRole("dialog", { name: "Hesap Düzenle" })).toBeInTheDocument();

    // Satır listeden düşer (ör. arama daraldı / kayıt silindi).
    vi.mocked(useChartOfAccounts).mockReturnValue(
      queryResult({ data: listResponse(ACCOUNTS.filter((a) => a.code !== "100")) }),
    );
    rerender(<ChartOfAccountsView />);

    expect(screen.getByTestId("hp-dialog-missing")).toHaveTextContent("Hesap listede bulunamadı");
    // 🔴 EN KRİTİK İDDİA: BOŞ "Yeni Hesap" formu AÇILMAZ.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("hp-dialog-code")).toBeNull();

    await user.click(screen.getByTestId("hp-dialog-close"));
    expect(screen.queryByTestId("hp-dialog-missing")).toBeNull();
  });
});
