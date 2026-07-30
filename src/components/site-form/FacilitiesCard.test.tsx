import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FacilitiesCard } from "./FacilitiesCard";
import { emptySiteFormValues } from "./form-state";
import { STORAGE_FACILITIES, SITE_FACILITIES } from "./facility-items";

function renderCard(overrides: Partial<React.ComponentProps<typeof FacilitiesCard>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <FacilitiesCard values={emptySiteFormValues()} onChange={onChange} {...overrides} />,
  );
  return { ...utils, onChange };
}

describe("FacilitiesCard", () => {
  it("kart basligi mockup satir 148 ile birebir", () => {
    renderCard();
    expect(screen.getByText("📦 Depo & Şantiye Altyapısı")).toBeInTheDocument();
  });

  it("sekiz kutucugun HEPSI isaretsiz acilir (§11.12)", () => {
    renderCard();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(8);
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
  });

  it("depo grubunda 3, tesis grubunda 5 kutucuk vardir", () => {
    renderCard();
    expect(within(screen.getByRole("group", { name: "Depo Alanları" })).getAllByRole("checkbox")).toHaveLength(3);
    expect(within(screen.getByRole("group", { name: "Şantiye Tesisleri" })).getAllByRole("checkbox")).toHaveLength(5);
  });

  it("kutucuk etiketleri mockup metinleriyle birebir", () => {
    renderCard();
    const labels = [
      "D-1 Kapalı Ambar",
      "D-2 Açık Alan (Demir, kum, çakıl)",
      "D-3 Soğuk Hava Deposu",
      "Şantiye Ofisi (Konteyner)",
      "İşçi Yemekhanesi",
      "Soyunma / WC",
      "İşçi Yatakhanesi",
      "Revir / İlk Yardım",
    ];
    labels.forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument());
  });

  it("her grup role=group ve aria-labelledby tasir", () => {
    renderCard();
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    groups.forEach((group) => expect(group).toHaveAttribute("aria-labelledby"));
  });

  it("grup basliklari 'Depo Alanlari' ve 'Santiye Tesisleri'", () => {
    renderCard();
    expect(screen.getByText("Depo Alanları")).toBeInTheDocument();
    expect(screen.getByText("Şantiye Tesisleri")).toBeInTheDocument();
  });

  it("kutucuk isaretlenince ilgili facilities anahtari true olur", async () => {
    const user = userEvent.setup();
    const { onChange } = renderCard();

    await user.click(screen.getByLabelText("Şantiye Ofisi (Konteyner)"));

    expect(onChange).toHaveBeenCalledWith("facilities", {
      ...emptySiteFormValues().facilities,
      site_office: true,
    });
  });

  it("isaretli kutucuk kaldirilinca anahtar false olur", async () => {
    const user = userEvent.setup();
    const values = emptySiteFormValues();
    const { onChange } = renderCard({
      values: { ...values, facilities: { ...values.facilities, canteen: true } },
    });

    await user.click(screen.getByLabelText("İşçi Yemekhanesi"));

    expect(onChange).toHaveBeenCalledWith("facilities", {
      ...values.facilities,
      canteen: false,
    });
  });

  it("cip, sayac veya arama kutusu YOK", () => {
    const { container } = renderCard();
    expect(container.querySelector('input[type="search"]')).toBeNull();
    expect(container.querySelector(".badge")).toBeNull();
    expect(screen.queryByText(/seçili/i)).not.toBeInTheDocument();
  });

  it("planlanan isci sayisi type=number'dir, abonelik alanlari metindir", () => {
    renderCard();
    expect(screen.getByLabelText("Planlanan İşçi Sayısı")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Elektrik Aboneliği")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Su Aboneliği")).toHaveAttribute("type", "text");
  });

  it("alt izgara yer tutucular mockup satir 170-172 ile birebir", () => {
    renderCard();
    expect(screen.getByLabelText("Elektrik Aboneliği")).toHaveAttribute("placeholder", "Abone no");
    expect(screen.getByLabelText("Su Aboneliği")).toHaveAttribute("placeholder", "Abone no");
    expect(screen.getByLabelText("Planlanan İşçi Sayısı")).toHaveAttribute("placeholder", "48");
  });
});

describe("facility-items", () => {
  it("iki grup YALNIZ GORSELDIR; anahtarlar tek duz facilities nesnesine yazar", () => {
    expect(STORAGE_FACILITIES.map((item) => item.key)).toEqual([
      "closed_warehouse",
      "open_storage",
      "cold_storage",
    ]);
    expect(SITE_FACILITIES.map((item) => item.key)).toEqual([
      "site_office",
      "canteen",
      "changing_room_wc",
      "dormitory",
      "infirmary",
    ]);
  });
});
