import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BasicInfoCard } from "./BasicInfoCard";
import type { BasicInfoValues } from "./types";

const values: BasicInfoValues = {
  name: "",
  code: "",
  category: "",
  status: "active",
  city: "",
  parcel: "",
  address: "",
};

describe("BasicInfoCard (F6)", () => {
  it("kart başlığı <h2> 'Temel Bilgiler' (mockup satır 82 emoji ön eki ile)", () => {
    render(<BasicInfoCard values={values} onChange={() => {}} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "📋 Temel Bilgiler" }),
    ).toBeInTheDocument();
  });

  it("category etiketi 'Tür' basılır (§7.1) — 'Proje Tipi' değil", () => {
    render(<BasicInfoCard values={values} onChange={() => {}} />);
    expect(screen.getByLabelText("Tür")).toBeInTheDocument();
    expect(screen.queryByLabelText("Proje Tipi")).not.toBeInTheDocument();
  });

  it("Durum açılırında yalnız üç seçenek; completed/Tamamlan* yok (§7.2)", () => {
    render(<BasicInfoCard values={values} onChange={() => {}} />);
    const status = screen.getByLabelText("Durum");
    const options = Array.from(status.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Planlama", "Aktif", "Beklemede"]);
  });

  it("her kontrol Field üzerinden bağlı label taşır", () => {
    render(<BasicInfoCard values={values} onChange={() => {}} />);
    expect(screen.getByLabelText("Proje Adı")).toBeInTheDocument();
    expect(screen.getByLabelText("Proje Kodu")).toBeInTheDocument();
    expect(screen.getByLabelText("İl / İlçe")).toBeInTheDocument();
    expect(screen.getByLabelText("Ada / Parsel")).toBeInTheDocument();
    // Açık Adres bir textarea
    expect(screen.getByLabelText("Açık Adres").tagName).toBe("TEXTAREA");
  });

  it("alan değişince onChange(field, value) çağrılır", async () => {
    const onChange = vi.fn();
    render(<BasicInfoCard values={values} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Proje Adı"), "G");
    expect(onChange).toHaveBeenCalledWith("name", "G");
  });
});
