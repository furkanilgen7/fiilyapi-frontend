import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  SiteRepeaterCard,
  emptySiteRow,
  isSiteRowEmpty,
  siteRowError,
  collectSiteInputs,
  type SiteRow,
} from "./SiteRepeaterCard";

const managers = ["Sercan Öztürk", "Kadir Yıldız"];

function row(partial: Partial<SiteRow> = {}): SiteRow {
  return { ...emptySiteRow(), ...partial };
}

describe("SiteRepeaterCard yardımcıları (F9)", () => {
  it("tümü boş satır boş sayılır", () => {
    expect(isSiteRowEmpty(emptySiteRow())).toBe(true);
    expect(isSiteRowEmpty(row({ name: "A" }))).toBe(false);
  });

  it("adı boş ama dolu satır hatadır", () => {
    expect(siteRowError(row({ constructionAreaM2: "500" }))).toBe(
      "Şantiye adı zorunludur.",
    );
    expect(siteRowError(emptySiteRow())).toBeNull();
    expect(siteRowError(row({ name: "A" }))).toBeNull();
  });

  it("boş satırlar gönderime dahil edilmez; şef adı metne dönüşür", () => {
    const rows = [
      row({ name: "A-Blok", siteManagerName: "Sercan Öztürk", constructionAreaM2: "6420" }),
      emptySiteRow(),
    ];
    const inputs = collectSiteInputs(rows);
    expect(inputs).toEqual([
      { name: "A-Blok", site_manager_name: "Sercan Öztürk", construction_area_m2: 6420 },
    ]);
  });

  it("şef seçilmezse site_manager_name null (FK değil, nullable)", () => {
    const inputs = collectSiteInputs([row({ name: "B" })]);
    expect(inputs[0].site_manager_name).toBeNull();
    expect(inputs[0].construction_area_m2).toBeNull();
  });
});

describe("SiteRepeaterCard bileşeni (F9)", () => {
  it("Şantiye Şefi açılırı 'Seçiniz…' + kullanıcı adlarını taşır", () => {
    render(
      <SiteRepeaterCard
        rows={[emptySiteRow()]}
        onChange={() => {}}
        managerNames={managers}
      />,
    );
    const select = screen.getByLabelText("Şantiye Şefi");
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Seçiniz…", "Sercan Öztürk", "Kadir Yıldız"]);
  });

  it("Ekle bir boş satır ekler", async () => {
    const onChange = vi.fn();
    render(
      <SiteRepeaterCard
        rows={[emptySiteRow()]}
        onChange={onChange}
        managerNames={managers}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "+ Şantiye Ekle" }));
    // id'ler kararlı-benzersiz üretilir (react-reviewer: index key yerine); içerik
    // karşılaştırması id'yi hariç tutar, ikinci satırın yeni/farklı id'si doğrulanır.
    expect(onChange).toHaveBeenCalledTimes(1);
    const rows = onChange.mock.calls[0][0] as SiteRow[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "", siteManagerName: "", constructionAreaM2: "" });
    expect(rows[1]).toMatchObject({ name: "", siteManagerName: "", constructionAreaM2: "" });
    expect(rows[0].id).not.toBe(rows[1].id);
  });

  it("Sil son satırı da kaldırabilir (sıfır satır geçerli)", async () => {
    const onChange = vi.fn();
    render(
      <SiteRepeaterCard
        rows={[emptySiteRow()]}
        onChange={onChange}
        managerNames={managers}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Şantiye satırını sil" }),
    );
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("satır hatası alan altında gösterilir", () => {
    render(
      <SiteRepeaterCard
        rows={[row({ constructionAreaM2: "500" })]}
        onChange={() => {}}
        managerNames={managers}
        errors={["Şantiye adı zorunludur."]}
      />,
    );
    expect(screen.getByText("Şantiye adı zorunludur.")).toBeInTheDocument();
  });
});
