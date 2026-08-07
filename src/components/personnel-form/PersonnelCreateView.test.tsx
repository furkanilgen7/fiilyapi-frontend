import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PersonnelCreateView, safeReturnTo } from "./PersonnelCreateView";
import { useCreatePersonnel } from "@/lib/api/hooks/usePersonnelMutations";
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
vi.mock("@/lib/api/hooks/usePersonnelMutations", () => ({ useCreatePersonnel: vi.fn() }));
vi.mock("@/lib/api/hooks/useSubcontractors", () => ({ useSubcontractors: vi.fn() }));

const mutate = vi.fn();

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { personnel: level } } as unknown as MeResponse,
    isLoading: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  mockSession("full");
  vi.mocked(useCreatePersonnel).mockReturnValue({ mutate, isPending: false } as never);
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
function submitButton() {
  return within(document.querySelector(".pf-actions") as HTMLElement).getByRole("button", {
    name: "Personeli Kaydet",
  });
}

/** Mockup satır 63/64/91/95/99 — formun DOLDURULABİLİR dört alanı. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Ad"), "Mehmet");
  await user.type(screen.getByLabelText("Soyad"), "Yılmaz");
  await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "company");
  await user.selectOptions(screen.getByLabelText("Meslek / Görev"), "Elektrikçi");
}

describe("PersonnelCreateView · mockup sadakati", () => {
  it("baslik, alt baslik ve dort kart basilir (47, 48, 52, 75, 87, 123)", () => {
    render(<PersonnelCreateView />);
    expect(screen.getByRole("heading", { level: 1, name: "Yeni Personel Kaydı" })).toBeVisible();
    expect(screen.getByText(/SGK bildirimi otomatik oluşturulur/)).toBeVisible();
    expect(screen.getByText("👤 Kimlik Bilgileri")).toBeVisible();
    expect(screen.getByText("📞 İletişim Bilgileri")).toBeVisible();
    expect(screen.getByText("💼 İş Bilgileri")).toBeVisible();
    expect(screen.getByText("📎 Belgeler")).toBeVisible();
  });

  it("mockup'taki TUM alanlar basilir — hicbiri silinmez", () => {
    render(<PersonnelCreateView />);
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

  it("alti belge kutusu + surukle-birak + uyari kutusu basilir (126-200)", () => {
    render(<PersonnelCreateView />);
    for (const title of [
      "Kimlik Fotokopisi",
      "Sağlık Raporu",
      "İSG Eğitim Sertifikası",
      "Mesleki Yeterlilik Belgesi",
      "Operatör / Ehliyet Belgesi",
      "İş Sözleşmesi",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Diğer belgeleri buraya sürükleyin")).toBeInTheDocument();
    expect(screen.getByText("⚠ Zorunlu belgeler eksikse")).toBeInTheDocument();
    // Yükleme yok: hiçbir dosya seçici render EDİLMEZ.
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });

  it("meslek secenekleri mockup'in SEKIZI, sirasi korunmus (99)", () => {
    render(<PersonnelCreateView />);
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
    render(<PersonnelCreateView />);
    expect(screen.getByLabelText("TC Kimlik No")).toHaveAttribute("maxlength", "11");
  });
});

describe("PersonnelCreateView · pending yüzeyler", () => {
  it("sunucu karsiligi olmayan alanlarin HEPSI devre disidir", () => {
    render(<PersonnelCreateView />);
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
    render(<PersonnelCreateView />);
    for (const label of ["Ad", "Soyad", "Çalışan Tipi", "Meslek / Görev"]) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
  });

  it("gerekceler GORUNUR listede yazar — title'da saklanmaz", () => {
    render(<PersonnelCreateView />);
    const notices = screen.getByTestId("personnel-form-notices");
    expect(notices).toHaveTextContent(/belge modülünün form eklentisi sonraki dilimde gelir/);
    expect(notices).toHaveTextContent(/Serbest Meslek/);
    expect(notices).toHaveTextContent(/Stajyer/);
    expect(notices).toHaveTextContent(/Taslak Kaydet.*devre dışı/);
    expect(notices).toHaveTextContent(/zorunluluk \(\*\) işaretleri/);
  });

  it("karsiliksiz iki calisan tipi BASILIR ama secilemez (91)", () => {
    render(<PersonnelCreateView />);
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
    // Sessizce `general`'a EŞLENMEZ: seçilemez.
    expect(byLabel.get("Serbest Meslek")).toBeDisabled();
    expect(byLabel.get("Stajyer")).toBeDisabled();
  });

  it("iki 'Taslak' butonu da devre disidir (39, 211)", () => {
    render(<PersonnelCreateView />);
    expect(screen.getByRole("button", { name: "Taslak" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Taslak Kaydet" })).toBeDisabled();
  });

  it("SGK kutucugu devre disi VE isaretsizdir (206)", () => {
    render(<PersonnelCreateView />);
    const checkbox = screen.getByLabelText(/SGK işe giriş bildirgesi/);
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });
});

describe("PersonnelCreateView · Bağlı Taşeron", () => {
  it("varsayilanda devre disidir ve gerekcesi GORUNUR yazar", () => {
    render(<PersonnelCreateView />);
    expect(screen.getByLabelText("Bağlı Taşeron")).toBeDisabled();
    expect(screen.getByText(/yalnız “Taşeron İşçisi” seçildiğinde girilir/)).toBeVisible();
  });

  it("Taseron Iscisi secilince acilir ve GERCEK veriyi listeler (mockup sabitleri DEGIL)", async () => {
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "subcontractor");

    const select = screen.getByLabelText("Bağlı Taşeron");
    expect(select).toBeEnabled();
    const options = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "— (Şirket kadrosu)",
      "Aydın Elektrik Taah.",
      "Çelik İnşaat Taah.",
    ]);
    expect(options).not.toContain("Akın İnşaat");
  });

  it("taseron listesi yuklenemezse sessiz bos secici birakmaz", () => {
    vi.mocked(useSubcontractors).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    render(<PersonnelCreateView />);
    expect(screen.getByLabelText("Bağlı Taşeron")).toBeInTheDocument();
  });
});

describe("PersonnelCreateView · doğrulama ve gönderim", () => {
  it("bos formda YALNIZ etkin alanlar dogrulanir; devre disi alanlar engellemez", async () => {
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await user.click(submitButton());

    expect(mutate).not.toHaveBeenCalled();
    // Özet şeridi ilk mesajı TEKRARLAR (yeni dize üretilmez) → iki kopya.
    expect(screen.getAllByText("Ad zorunludur.").length).toBeGreaterThan(0);
    expect(screen.getByText("Soyad zorunludur.")).toBeVisible();
    expect(screen.getByText("Çalışan tipi seçiniz.")).toBeVisible();
    expect(screen.getByText("Meslek / görev seçiniz.")).toBeVisible();
    // Devre-dışı zorunlu alanlar için HATA ÜRETİLMEZ.
    expect(screen.queryByText(/TC Kimlik No zorunlu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adres zorunlu/)).not.toBeInTheDocument();
  });

  it("dort alan dolunca govde YALNIZ sozlesme anahtarlariyla gonderilir", async () => {
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await fillRequired(user);
    await user.click(submitButton());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({
      full_name: "Mehmet Yılmaz",
      trade: "Elektrikçi",
      source: "company",
      is_active: true,
    });
  });

  it("taserondan sirket kadrosuna donulunce secim TEMIZLENIR (govdeye sizmaz)", async () => {
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await user.type(screen.getByLabelText("Ad"), "Ali");
    await user.type(screen.getByLabelText("Soyad"), "Veli");
    await user.selectOptions(screen.getByLabelText("Meslek / Görev"), "Elektrikçi");
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "subcontractor");
    await user.selectOptions(screen.getByLabelText("Bağlı Taşeron"), "sub-1");
    await user.selectOptions(screen.getByLabelText("Çalışan Tipi"), "company");
    await user.click(submitButton());

    expect(mutate.mock.calls[0][0]).not.toHaveProperty("subcontractor_id");
  });

  it("kayit basarili olunca gelinen ekrana doner", async () => {
    searchParams = new URLSearchParams({ donus: "/projeler/p-1/santiyeler/s-1/puantaj?year=2026" });
    mutate.mockImplementation((_body, options) => options.onSuccess?.({}));
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await fillRequired(user);
    await user.click(submitButton());

    expect(push).toHaveBeenCalledWith("/projeler/p-1/santiyeler/s-1/puantaj?year=2026");
  });

  it("Iptal donus rotasina gider; parametre yoksa genel puantaja duser", async () => {
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await user.click(screen.getAllByRole("button", { name: "İptal" })[0]);
    expect(push).toHaveBeenCalledWith("/puantaj");
  });

  it("sunucu hatasi Turkce gosterilir, yutulmaz", async () => {
    mutate.mockImplementation((_body, options) =>
      options.onError?.(new BackendError(422, { detail: "taşeron bulunamadı" })),
    );
    const user = userEvent.setup();
    render(<PersonnelCreateView />);
    await fillRequired(user);
    await user.click(submitButton());
    expect(screen.getByTestId("personnel-form-error")).toHaveTextContent(/taşeron bulunamadı/);
  });

  it("personnel yetkisi olmayan AccessDenied gorur", () => {
    mockSession("none");
    render(<PersonnelCreateView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("view seviyesi de yetmez (form yalnizca full+ icin)", () => {
    mockSession("view");
    render(<PersonnelCreateView />);
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
