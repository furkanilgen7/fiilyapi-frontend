import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NAME_PART_MAX_LENGTH } from "./constants";
import { PersonnelForm, safeReturnTo } from "./PersonnelForm";
import { useCreatePersonnel, useUpdatePersonnel } from "@/lib/api/hooks/usePersonnelMutations";
import { usePersonnelDetail } from "@/lib/api/hooks/usePersonnelDetail";
import { useSubcontractors } from "@/lib/api/hooks/useSubcontractors";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnelMutations", () => ({
  useCreatePersonnel: vi.fn(),
  useUpdatePersonnel: vi.fn(),
}));
vi.mock("@/lib/api/hooks/usePersonnelDetail", () => ({ usePersonnelDetail: vi.fn() }));
vi.mock("@/lib/api/hooks/useSubcontractors", () => ({ useSubcontractors: vi.fn() }));

const createMutate = vi.fn();
const updateMutate = vi.fn();

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { personnel: level } } as unknown as MeResponse,
    isLoading: false,
  });
}

const DETAIL_FIXTURE = {
  id: "per-9",
  full_name: "Mehmet Yılmaz",
  trade: "Elektrikçi",
  source: "subcontractor" as const,
  subcontractor_id: "sub-1",
  user_id: null,
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  mockSession("full");
  vi.mocked(useCreatePersonnel).mockReturnValue({ mutate: createMutate, isPending: false } as never);
  vi.mocked(useUpdatePersonnel).mockReturnValue({ mutate: updateMutate, isPending: false } as never);
  vi.mocked(usePersonnelDetail).mockReturnValue({
    data: DETAIL_FIXTURE,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSubcontractors).mockReturnValue({
    data: {
      items: [
        { id: "sub-1", name: "Aydın Elektrik Taah." },
        { id: "sub-2", name: "Çelik İnşaat Taah." },
      ],
    },
    isLoading: false,
    isError: false,
  } as never);
});

/**
 * Mockup'ta "Personeli Kaydet" İKİ kez vardır (üst şerit 40 + alt şerit 212);
 * ikisi de aynı gönderimi tetikler. Testler alt şeridi kullanır.
 */
function submitButton(name = "Personeli Kaydet") {
  return within(document.querySelector(".pf-actions") as HTMLElement).getByRole("button", {
    name,
  });
}

/** Mockup satır 63/64/91/95/99 — formun DOLDURULABİLİR dört alanı. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Ad"), "Mehmet");
  await user.type(screen.getByLabelText("Soyad"), "Yılmaz");
  await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "company");
  await user.selectOptions(screen.getByLabelText("Meslek / Görev"), "Elektrikçi");
}

describe("PersonnelForm (create) · mockup sadakati", () => {
  it("baslik, alt baslik ve dort kart basilir (47, 48, 52, 75, 87, 123)", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.getByRole("heading", { level: 1, name: "Yeni Personel Kaydı" })).toBeVisible();
    expect(screen.getByText(/SGK bildirimi otomatik oluşturulur/)).toBeVisible();
    expect(screen.getByText("👤 Kimlik Bilgileri")).toBeVisible();
    expect(screen.getByText("📞 İletişim Bilgileri")).toBeVisible();
    expect(screen.getByText("💼 İş Bilgileri")).toBeVisible();
    expect(screen.getByText("📎 Belgeler")).toBeVisible();
  });

  it("İnsan Kaynakları kırıntısı GERÇEK linktir (/personel — kapsam C)", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.getByRole("link", { name: "İnsan Kaynakları" })).toHaveAttribute(
      "href",
      "/personel",
    );
  });

  it("mockup'taki TUM alanlar basilir — hicbiri silinmez", () => {
    render(<PersonnelForm mode="create" />);
    for (const label of [
      "Ad",
      "Soyad",
      "TC Kimlik No",
      "Doğum Tarihi",
      "Cinsiyet",
      "Medeni Durum",
      "Cep Telefonu",
      "E-posta",
      "Adres",
      "Acil Durum Kişisi",
      "Acil Durum Telefonu",
      "Çalışan Tipi",
      "Bağlı Taşeron",
      "Meslek / Görev",
      "İşe Giriş Tarihi",
      "Atandığı Proje",
      "Bölüm",
      "Ücret Tipi",
      "Ücret Tutarı (₺)",
      "Ödeme Şekli",
      "IBAN",
      "SGK Sicil No",
    ]) {
      expect(screen.getByLabelText(label), `${label} basılmadı`).toBeInTheDocument();
    }
  });

  it("meslek secenekleri mockup'in SEKIZI, sirasi korunmus (99)", () => {
    render(<PersonnelForm mode="create" />);
    const options = within(screen.getByLabelText("Meslek / Görev"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "Seçiniz...",
      "Kalıpçı Usta",
      "Demir Ustası",
      "Elektrikçi",
      "Sıhhi Tesisatçı",
      "Vinç Operatörü",
      "Şantiye Şefi",
      "Büro Personeli",
      "Amele / Yardımcı",
    ]);
  });

  it("TC Kimlik No mockup'in maxlength=11 degerini korur (65)", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.getByLabelText("TC Kimlik No")).toHaveAttribute("maxlength", "11");
  });

  it("Ad/Soyad sunucu sinirini DOM'da uygular — uzun giris KIRPILIR (422 olmaz)", async () => {
    render(<PersonnelForm mode="create" />);
    const name = screen.getByLabelText("Ad", { exact: true });
    const surname = screen.getByLabelText("Soyad");
    expect(name).toHaveAttribute("maxlength", String(NAME_PART_MAX_LENGTH));
    expect(surname).toHaveAttribute("maxlength", String(NAME_PART_MAX_LENGTH));

    await userEvent.type(name, "a".repeat(NAME_PART_MAX_LENGTH + 10));
    expect((name as HTMLInputElement).value).toHaveLength(NAME_PART_MAX_LENGTH);
  });

  it("düzenleme kipine özgü 'Aktif personel' kutucuğu CREATE'te basılmaz", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.queryByLabelText("Aktif personel")).not.toBeInTheDocument();
  });
});

describe("PersonnelForm (create) · pending yüzeyler", () => {
  it("sunucu karsiligi olmayan alanlarin HEPSI devre disidir", () => {
    render(<PersonnelForm mode="create" />);
    for (const label of [
      "TC Kimlik No",
      "Doğum Tarihi",
      "Cinsiyet",
      "Medeni Durum",
      "Cep Telefonu",
      "E-posta",
      "Adres",
      "Acil Durum Kişisi",
      "Acil Durum Telefonu",
      "İşe Giriş Tarihi",
      "Atandığı Proje",
      "Bölüm",
      "Ücret Tipi",
      "Ücret Tutarı (₺)",
      "Ödeme Şekli",
      "IBAN",
      "SGK Sicil No",
    ]) {
      expect(screen.getByLabelText(label), `${label} devre dışı değil`).toBeDisabled();
    }
  });

  it("dort ETKIN alan devre disi DEGILDIR", () => {
    render(<PersonnelForm mode="create" />);
    for (const label of ["Ad", "Soyad", "Çalışan Tipi", "Meslek / Görev"]) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
  });

  it("gerekceler GORUNUR listede yazar — title'da saklanmaz", () => {
    render(<PersonnelForm mode="create" />);
    const notices = screen.getByTestId("personnel-form-notices");
    expect(notices).toHaveTextContent(/belge modülünün form eklentisi sonraki dilimde gelir/);
    expect(notices).toHaveTextContent(/Serbest Meslek/);
    expect(notices).toHaveTextContent(/Stajyer/);
    expect(notices).toHaveTextContent(/Taslak Kaydet.*devre dışı/);
    expect(notices).toHaveTextContent(/zorunluluk \(\*\) işaretleri/);
  });

  it("karsiliksiz iki calisan tipi BASILIR ama secilemez (91)", () => {
    render(<PersonnelForm mode="create" />);
    const options = within(screen.getByLabelText("Çalışan Tipi")).getAllByRole("option");
    const byLabel = new Map(options.map((option) => [option.textContent, option]));
    expect([...byLabel.keys()]).toEqual([
      "Seçiniz...",
      "Şirket Kadrosu (4a)",
      "Taşeron İşçisi",
      "Serbest Meslek",
      "Stajyer",
    ]);
    expect(byLabel.get("Şirket Kadrosu (4a)")).toBeEnabled();
    expect(byLabel.get("Taşeron İşçisi")).toBeEnabled();
    expect(byLabel.get("Serbest Meslek")).toBeDisabled();
    expect(byLabel.get("Stajyer")).toBeDisabled();
  });

  it("iki 'Taslak' butonu da devre disidir (39, 211)", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.getByRole("button", { name: "Taslak" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Taslak Kaydet" })).toBeDisabled();
  });

  it("SGK kutucugu devre disi VE isaretsizdir (206)", () => {
    render(<PersonnelForm mode="create" />);
    const checkbox = screen.getByLabelText(/SGK işe giriş bildirgesi/);
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });
});

describe("PersonnelForm (create) · Bağlı Taşeron", () => {
  it("varsayilanda devre disidir ve gerekcesi GORUNUR yazar", () => {
    render(<PersonnelForm mode="create" />);
    expect(screen.getByLabelText("Bağlı Taşeron")).toBeDisabled();
    expect(screen.getByText(/yalnız “Taşeron İşçisi” seçildiğinde girilir/)).toBeVisible();
  });

  it("Taseron Iscisi secilince acilir ve GERCEK veriyi listeler (mockup sabitleri DEGIL)", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "subcontractor");

    const select = screen.getByLabelText("Bağlı Taşeron");
    expect(select).toBeEnabled();
    const options = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["— (Şirket kadrosu)", "Aydın Elektrik Taah.", "Çelik İnşaat Taah."]);
  });
});

describe("PersonnelForm (create) · doğrulama ve gönderim", () => {
  it("bos formda YALNIZ etkin alanlar dogrulanir; devre disi alanlar engellemez", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await user.click(submitButton());

    expect(createMutate).not.toHaveBeenCalled();
    expect(screen.getAllByText("Ad zorunludur.").length).toBeGreaterThan(0);
    expect(screen.getByText("Soyad zorunludur.")).toBeVisible();
    expect(screen.getByText("Çalışan tipi seçiniz.")).toBeVisible();
    expect(screen.getByText("Meslek / görev seçiniz.")).toBeVisible();
  });

  it("dort alan dolunca govde YALNIZ sozlesme anahtarlariyla gonderilir", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await fillRequired(user);
    await user.click(submitButton());

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({
      full_name: "Mehmet Yılmaz",
      trade: "Elektrikçi",
      source: "company",
      is_active: true,
    });
  });

  it("taserondan sirket kadrosuna donulunce secim TEMIZLENIR (govdeye sizmaz)", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await user.type(screen.getByLabelText("Ad"), "Ali");
    await user.type(screen.getByLabelText("Soyad"), "Veli");
    await user.selectOptions(screen.getByLabelText("Meslek / Görev"), "Elektrikçi");
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "subcontractor");
    await user.selectOptions(screen.getByLabelText("Bağlı Taşeron"), "sub-1");
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "company");
    await user.click(submitButton());

    expect(createMutate.mock.calls[0][0]).not.toHaveProperty("subcontractor_id");
  });

  it("kayit basarili olunca gelinen ekrana doner", async () => {
    searchParams = new URLSearchParams({ donus: "/projeler/p-1/santiyeler/s-1/puantaj?year=2026" });
    createMutate.mockImplementation((_body, options) => options.onSuccess?.({}));
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await fillRequired(user);
    await user.click(submitButton());

    expect(push).toHaveBeenCalledWith("/projeler/p-1/santiyeler/s-1/puantaj?year=2026");
  });

  it("Iptal donus rotasina gider; parametre yoksa genel puantaja duser", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await user.click(screen.getAllByRole("button", { name: "İptal" })[0]);
    expect(push).toHaveBeenCalledWith("/puantaj");
  });

  it("sunucu hatasi Turkce gosterilir, yutulmaz", async () => {
    createMutate.mockImplementation((_body, options) =>
      options.onError?.(new BackendError(422, { detail: "taşeron bulunamadı" })),
    );
    const user = userEvent.setup();
    render(<PersonnelForm mode="create" />);
    await fillRequired(user);
    await user.click(submitButton());
    expect(screen.getByTestId("personnel-form-error")).toHaveTextContent(/taşeron bulunamadı/);
  });

  it("personnel yetkisi olmayan AccessDenied gorur", () => {
    mockSession("none");
    render(<PersonnelForm mode="create" />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("view seviyesi de yetmez (form yalnizca full+ icin)", () => {
    mockSession("view");
    render(<PersonnelForm mode="create" />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("safeReturnTo", () => {
  it("uygulama ici mutlak yolu gecirir", () => {
    expect(safeReturnTo("/puantaj?site=s-1")).toBe("/puantaj?site=s-1");
  });

  it("dis adresi ve protokol-bagimsiz yolu REDDEDER", () => {
    expect(safeReturnTo("https://evil.example/x")).toBe("/puantaj");
    expect(safeReturnTo("//evil.example")).toBe("/puantaj");
    expect(safeReturnTo(null)).toBe("/puantaj");
  });
});

/* ── F-PT2 T3 · Düzenleme kipi ─────────────────────────────────────────── */

describe("PersonnelForm (edit) · önyükleme + mockup sadakati", () => {
  it("başlık/gönder etiketi düzenleme kipine göre değişir", () => {
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    expect(screen.getByRole("heading", { level: 1, name: "Personeli Düzenle" })).toBeVisible();
    expect(submitButton("Kaydet")).toBeInTheDocument();
  });

  it("mevcut değerler forma ÖNYÜKLENİR (full_name ikiye bölünür)", () => {
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    expect(screen.getByLabelText("Ad")).toHaveValue("Mehmet");
    expect(screen.getByLabelText("Soyad")).toHaveValue("Yılmaz");
    expect(screen.getByLabelText("Çalışan Tipi")).toHaveValue("subcontractor");
    expect(screen.getByLabelText("Bağlı Taşeron")).toHaveValue("sub-1");
    expect(screen.getByLabelText("Meslek / Görev")).toHaveValue("Elektrikçi");
  });

  it("'Aktif personel' kutucuğu basılır, mevcut değeri taşır ve DÜZENLENEBİLİR", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    const toggle = screen.getByLabelText("Aktif personel");
    expect(toggle).toBeEnabled();
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it("create'teki pending alanlar düzenleme kipinde de AYNI pending kalır", () => {
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    for (const label of ["TC Kimlik No", "Cep Telefonu", "Ücret Tutarı (₺)", "IBAN"]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    const options = within(screen.getByLabelText("Çalışan Tipi")).getAllByRole("option");
    const byLabel = new Map(options.map((option) => [option.textContent, option]));
    expect(byLabel.get("Serbest Meslek")).toBeDisabled();
    expect(byLabel.get("Stajyer")).toBeDisabled();
  });

  it("yükleniyor durumunda formu basmaz", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    expect(screen.getByText("Yükleniyor…")).toBeVisible();
    expect(screen.queryByLabelText("Ad")).not.toBeInTheDocument();
  });

  it("bulunamayan personel için hata mesajı gösterir", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(404, { detail: "personel yok" }),
    } as never);
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    expect(screen.getByText("Personel yüklenemedi")).toBeVisible();
  });

  it("403 AccessDenied gösterir", () => {
    vi.mocked(usePersonnelDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(403, { detail: "yetkisiz" }),
    } as never);
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("PersonnelForm (edit) · gönderim", () => {
  it("kaydet PATCH gövdesini üretir ve detay sayfasına döner", async () => {
    updateMutate.mockImplementation((_body, options) => options.onSuccess?.({}));
    const user = userEvent.setup();
    render(<PersonnelForm mode="edit" personnelId="per-9" />);

    await user.selectOptions(screen.getByLabelText("Meslek / Görev"), "Sıhhi Tesisatçı");
    await user.click(submitButton("Kaydet"));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0][0]).toEqual({
      full_name: "Mehmet Yılmaz",
      trade: "Sıhhi Tesisatçı",
      source: "subcontractor",
      subcontractor_id: "sub-1",
      is_active: true,
    });
    expect(push).toHaveBeenCalledWith("/personel/per-9");
  });

  it("şirket kadrosuna dönülünce subcontractor_id AÇIKÇA null gider", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "company");
    await user.click(submitButton("Kaydet"));

    expect(updateMutate.mock.calls[0][0]).toMatchObject({ subcontractor_id: null });
  });

  it("İptal detay sayfasına döner (dönüş parametresi DEĞİL)", async () => {
    const user = userEvent.setup();
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    await user.click(screen.getAllByRole("button", { name: "İptal" })[0]);
    expect(push).toHaveBeenCalledWith("/personel/per-9");
  });

  it("sunucu hatası Türkçe gösterilir", async () => {
    updateMutate.mockImplementation((_body, options) =>
      options.onError?.(new BackendError(422, { detail: "geçersiz istek" })),
    );
    const user = userEvent.setup();
    render(<PersonnelForm mode="edit" personnelId="per-9" />);
    await user.click(submitButton("Kaydet"));
    expect(screen.getByTestId("personnel-form-error")).toHaveTextContent(/geçersiz istek/);
  });
});
