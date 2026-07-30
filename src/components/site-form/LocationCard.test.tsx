import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LocationCard } from "./LocationCard";
import { emptySiteFormValues } from "./form-state";

function renderCard(overrides: Partial<React.ComponentProps<typeof LocationCard>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <LocationCard values={emptySiteFormValues()} onChange={onChange} {...overrides} />,
  );
  return { ...utils, onChange };
}

describe("LocationCard", () => {
  it("kart basligi mockup satir 77 ile birebir", () => {
    renderCard();
    expect(screen.getByText("🗺 Konum & Alan")).toBeInTheDocument();
  });

  it("GPS alani serbest metindir: 'kuzey kapi' girilince hata uretmez", async () => {
    const user = userEvent.setup();
    const { onChange } = renderCard();
    const gps = screen.getByLabelText("GPS Koordinatı");

    await user.type(gps, "kuzey kapı");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(gps).not.toHaveAttribute("aria-invalid");
    expect(onChange).toHaveBeenCalledWith("gpsCoordinates", expect.any(String));
  });

  it("GPS alani type=text'tir ve hicbir normallestirme yapmaz", () => {
    renderCard({ values: { ...emptySiteFormValues(), gpsCoordinates: "41.0082N 28.9784E" } });
    const gps = screen.getByLabelText("GPS Koordinatı");
    expect(gps).toHaveAttribute("type", "text");
    expect(gps).toHaveValue("41.0082N 28.9784E");
  });

  it("GPS ipucu 'Puantaj konum dogrulamasi icin' basar — kural degildir", () => {
    renderCard();
    expect(screen.getByText("Puantaj konum doğrulaması için")).toBeInTheDocument();
  });

  it("Acik Adres textarea'dir ve iki sutuna yayilir", () => {
    const { container } = renderCard();
    const address = screen.getByLabelText("Açık Adres");
    expect(address.tagName).toBe("TEXTAREA");
    expect(address).toHaveAttribute("rows", "2");
    expect(container.querySelector(".pf-col-span-2")).not.toBeNull();
  });

  it("Kat Sayisi metin alanidir, type=number degildir", () => {
    renderCard();
    expect(screen.getByLabelText("Kat Sayısı")).toHaveAttribute("type", "text");
  });

  it("Insaat Alani zorunluluk yildizi tasir, Arsa Alani tasimaz", () => {
    renderCard();
    expect(screen.getByLabelText("İnşaat Alanı (m²)")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Arsa Alanı (m²)")).not.toHaveAttribute("aria-required");
  });

  it("Il / Ilce zorunludur", () => {
    renderCard();
    expect(screen.getByLabelText("İl / İlçe")).toHaveAttribute("aria-required", "true");
  });

  it("yer tutucular mockup satir 79-86 ile birebir", () => {
    renderCard();
    expect(screen.getByLabelText("İl / İlçe")).toHaveAttribute("placeholder", "Çankaya / Ankara");
    expect(screen.getByLabelText("Mahalle")).toHaveAttribute("placeholder", "Kuyubaşı Mah.");
    expect(screen.getByLabelText("Ada / Parsel")).toHaveAttribute("placeholder", "1234 / 5");
    expect(screen.getByLabelText("Açık Adres")).toHaveAttribute("placeholder", "Cadde, sokak, no");
    expect(screen.getByLabelText("GPS Koordinatı")).toHaveAttribute("placeholder", "39.9042, 32.8597");
    expect(screen.getByLabelText("Arsa Alanı (m²)")).toHaveAttribute("placeholder", "2840");
    expect(screen.getByLabelText("İnşaat Alanı (m²)")).toHaveAttribute("placeholder", "6420");
    expect(screen.getByLabelText("Kat Sayısı")).toHaveAttribute("placeholder", "2 bodrum + 10 normal");
  });
});

describe("LocationCard — sessiz 422 koruması: kalan metin alanları", () => {
  // GPS'te yapılanın aynısı: sunucu sınırı olan ve istemci koruması olmayan
  // alanlar 422'ye sessizce çarpıyordu. YALNIZ uzunluk — biçim kuralı yok.
  it.each([
    ["İl / İlçe", "100"],
    ["Mahalle", "150"],
    ["Ada / Parsel", "50"],
    ["Açık Adres", "300"],
    ["Kat Sayısı", "100"],
  ])("%s alani sozlesme sinirinda kesilir (maxLength=%s)", (label, limit) => {
    renderCard();
    expect(screen.getByLabelText(label)).toHaveAttribute("maxlength", limit);
  });

  it("uzunluk disinda yeni bicim kurali eklenmedi", () => {
    renderCard();
    for (const label of ["İl / İlçe", "Mahalle", "Ada / Parsel", "Açık Adres", "Kat Sayısı"]) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute("pattern");
    }
  });
});

describe("LocationCard — GPS uzunluk koruması (sözleşme maxLength=50)", () => {
  // Sunucu `gps_coordinates` icin maxLength=50 ilan ediyor (openapi.json).
  // Istemcide karsiligi yoksa 51. karakter HIC UYARI OLMADAN 422 aliyordu.
  it("GPS alani 50 karakterde kesilir", () => {
    renderCard();
    expect(screen.getByLabelText("GPS Koordinatı")).toHaveAttribute("maxlength", "50");
  });

  it("uzunluk disinda BICIM kurali eklenmez: pattern yok, type text kalir", () => {
    renderCard();
    const gps = screen.getByLabelText("GPS Koordinatı");
    expect(gps).not.toHaveAttribute("pattern");
    expect(gps).toHaveAttribute("type", "text");
  });
});
