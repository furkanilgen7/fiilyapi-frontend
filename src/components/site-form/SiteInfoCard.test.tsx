import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteInfoCard } from "./SiteInfoCard";
import { emptySiteFormValues } from "./form-state";
import { OUTSOURCED_SAFETY_OFFICER, USER_LIST_NOTES } from "./constants";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";

vi.mock("@/lib/api/hooks/useUserOptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useUserOptions")>()),
  useUserOptions: vi.fn(),
}));

const OPTIONS = [
  { id: "u-1", full_name: "Sercan Öztürk", title: "Şantiye Şefi" },
  { id: "u-2", full_name: "Ayşe Demir", title: null },
];

function mockUsers(value: Partial<ReturnType<typeof useUserOptions>>) {
  vi.mocked(useUserOptions).mockReturnValue({
    options: [],
    isForbidden: false,
    isLoading: false,
    isError: false,
    ...value,
  } as never);
}

function renderCard(overrides: Partial<React.ComponentProps<typeof SiteInfoCard>> = {}) {
  return render(
    <SiteInfoCard
      values={emptySiteFormValues()}
      onChange={vi.fn()}
      projectName="Güneşkent Konut"
      {...overrides}
    />,
  );
}

describe("SiteInfoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers({ options: OPTIONS });
  });

  it("Bagli Proje secicisi disabled ve baglamdaki projeyi gosterir", () => {
    renderCard();
    const select = screen.getByLabelText("Bağlı Proje");
    expect(select).toBeDisabled();
    expect(select).toHaveValue("Güneşkent Konut");
  });

  it("Bagli Proje secicisi 'Santiye, girildigi projeye baglidir' title'i tasir", () => {
    renderCard();
    expect(screen.getByLabelText("Bağlı Proje")).toHaveAttribute(
      "title",
      "Şantiye, girildiği projeye bağlıdır",
    );
  });

  it("sef secicisi kullanici listesini basar, deger user.id'dir", () => {
    renderCard();
    const chief = screen.getByLabelText("Şantiye Şefi");
    const values = Array.from(chief.querySelectorAll("option")).map((o) => o.value);
    expect(values).toContain("u-1");
    expect(values).toContain("u-2");
  });

  it("secenek metni title doluysa 'Ad (Unvan)', bossa 'Ad'", () => {
    renderCard();
    const chief = screen.getByLabelText("Şantiye Şefi");
    const labels = Array.from(chief.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toContain("Sercan Öztürk (Şantiye Şefi)");
    expect(labels).toContain("Ayşe Demir");
  });

  it("sef secicisinde '+ Yeni Personel Ekle' YOK", () => {
    renderCard();
    expect(screen.queryByText("+ Yeni Personel Ekle")).not.toBeInTheDocument();
  });

  it("ISG secicisinin son secenegi 'Dis Kaynak — OSGB'", () => {
    renderCard();
    const safety = screen.getByLabelText("İSG Uzmanı");
    const options = Array.from(safety.querySelectorAll("option"));
    const last = options[options.length - 1];
    expect(last.textContent).toBe("Dış Kaynak — OSGB");
    expect(last.value).toBe(OUTSOURCED_SAFETY_OFFICER);
  });

  it("ISG etiketinde zorunluluk yildizi YOK, ipucu 'ISG mevzuati geregi zorunlu' VAR", () => {
    renderCard();
    expect(screen.getByLabelText("İSG Uzmanı")).not.toHaveAttribute("aria-required");
    expect(screen.getByText("İSG mevzuatı gereği zorunlu")).toBeInTheDocument();
  });

  it("durum secicisi varsayilan olarak 'active' secili ve uc secenek sunar", () => {
    renderCard();
    const status = screen.getByLabelText("Durum");
    expect(status).toHaveValue("active");
    const labels = Array.from(status.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toEqual(["Hazırlık", "Aktif", "Beklemede"]);
  });

  it("santiye kodu ipucu 'Bos birakilirsa otomatik' basar", () => {
    renderCard();
    expect(screen.getByText("Boş bırakılırsa otomatik")).toBeInTheDocument();
  });

  it("kullanici listesi yuklenirken seciciler disabled + 'Yukleniyor…'", () => {
    mockUsers({ isLoading: true });
    renderCard();
    expect(screen.getByLabelText("Şantiye Şefi")).toBeDisabled();
    expect(screen.getByLabelText("İSG Uzmanı")).toBeDisabled();
    expect(screen.getAllByText("Yükleniyor…").length).toBeGreaterThan(0);
  });

  it("kullanici listesi hatasinda disabled + 'Kullanicilar yuklenemedi' notu basar", () => {
    mockUsers({ isError: true });
    renderCard();
    expect(screen.getByLabelText("Şantiye Şefi")).toBeDisabled();
    expect(screen.getByText(USER_LIST_NOTES.error)).toBeInTheDocument();
  });

  it("secicilerin altinda 'Listede aradiginiz kisi yoksa…' notu basar", () => {
    renderCard();
    expect(screen.getByText(USER_LIST_NOTES.incomplete)).toBeInTheDocument();
  });
});

// Kullanici karari 2026-07-30 (plan TZ-4b, spec §10.1.1): `GET /users` yedi rolde
// 403 doner. Bu BEKLENEN davranistir; form cokmez, sessiz bos liste YASAKTIR.
describe("SiteInfoCard · kullanici listesi 403 zarif dususu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers({ isError: true, isForbidden: true });
  });

  it("(a) 403'te form COKMEZ, kart ve alanlari render edilir", () => {
    renderCard();
    expect(screen.getByText("📍 Şantiye Bilgileri")).toBeInTheDocument();
    expect(screen.getByLabelText("Şantiye Adı")).toBeInTheDocument();
  });

  it("(b) sef ve ISG secicilerinin altinda gorunur aciklama basilir", () => {
    renderCard();
    expect(screen.getByText(USER_LIST_NOTES.forbidden)).toBeInTheDocument();
    expect(USER_LIST_NOTES.forbidden).toBe(
      "Kişi listesini görme yetkiniz yok — bu alanları boş bırakabilirsiniz.",
    );
  });

  it("(b2) aciklama aria-describedby ile her iki seciciye baglidir", () => {
    renderCard();
    const note = screen.getByText(USER_LIST_NOTES.forbidden);
    const chief = screen.getByLabelText("Şantiye Şefi");
    const safety = screen.getByLabelText("İSG Uzmanı");
    expect(chief.getAttribute("aria-describedby")).toContain(note.id);
    expect(safety.getAttribute("aria-describedby")).toContain(note.id);
  });

  it("403'te seciciler disabled ve BOS acilir listeyle SESSIZCE birakilmaz", () => {
    renderCard();
    const chief = screen.getByLabelText("Şantiye Şefi");
    expect(chief).toBeDisabled();
    // Negatif: aciklama olmadan bos <select> kalmasi bu testi kirar.
    expect(screen.queryByText(USER_LIST_NOTES.forbidden)).toBeInTheDocument();
  });

  it("(c2) 403'te sef zorunlulugu KALKAR — yildiz ve aria-required basilmaz", () => {
    renderCard();
    expect(screen.getByLabelText("Şantiye Şefi")).not.toHaveAttribute("aria-required");
  });

  it("liste geldiginde sef zorunlulugu yeniden isler (gevseme kalici degil)", () => {
    mockUsers({ options: OPTIONS });
    renderCard();
    expect(screen.getByLabelText("Şantiye Şefi")).toHaveAttribute("aria-required", "true");
  });

  it("(d) 403 diger alanlari etkilemez: ad ve kod yazilabilir, ad zorunlu kalir", () => {
    renderCard();
    expect(screen.getByLabelText("Şantiye Adı")).not.toBeDisabled();
    expect(screen.getByLabelText("Şantiye Adı")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Şantiye Kodu")).not.toBeDisabled();
  });

  it("(d2) 403'te tum formu kapatan AccessDenied basilmaz", () => {
    renderCard();
    expect(screen.queryByText("Bu alana yetkiniz yok")).not.toBeInTheDocument();
  });
});

describe("SiteInfoCard — sessiz 422 koruması (sözleşme maxLength)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsers({ options: OPTIONS });
  });

  it.each([
    ["Şantiye Adı", "150"],
    ["Şantiye Kodu", "50"],
  ])("%s alani sozlesme sinirinda kesilir (maxLength=%s)", (label, limit) => {
    renderCard();
    expect(screen.getByLabelText(label)).toHaveAttribute("maxlength", limit);
  });

  it("uzunluk disinda yeni bicim kurali eklenmedi", () => {
    renderCard();
    expect(screen.getByLabelText("Şantiye Adı")).not.toHaveAttribute("pattern");
    expect(screen.getByLabelText("Şantiye Kodu")).not.toHaveAttribute("pattern");
  });
});
