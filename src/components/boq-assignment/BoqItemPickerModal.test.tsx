import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  BoqItemPickerModal,
  DISTRIBUTION_COLUMN_REASON,
  OTHER_SECTIONS_PRESERVED_NOTE,
  matchesSearch,
  pickerRows,
} from "./BoqItemPickerModal";
import type { BoqGroup } from "@/lib/api/hooks/useBoq";


const GROUPS = [
  {
    id: "bg-1",
    name: "BETONARME",
    sort_order: 10,
    group_total: "0",
    items: [
      {
        id: "bi-1",
        code: "03.001",
        description: "Kat Döşemesi Betonu C25/30",
        unit: "m³",
        quantity: "1900.000",
        unit_price: "1850.00",
        amount: "0",
        sort_order: 0,
        allocated_quantity: "1200.000",
        unallocated_quantity: "700.000",
        progress_pct: { available: false, value: null, pending_module: "x" },
      },
      {
        id: "bi-2",
        code: "03.020",
        description: "Tuğla Duvar",
        unit: "m²",
        quantity: "5800.000",
        unit_price: "280.00",
        amount: "0",
        sort_order: 1,
        // Kotanın TAMAMI dağıtılmış — mockup'ın devre dışı satırı.
        allocated_quantity: "5800.000",
        unallocated_quantity: "0.000",
        progress_pct: { available: false, value: null, pending_module: "x" },
      },
    ],
  },
] as unknown as BoqGroup[];

function renderPicker(onApply = vi.fn(), sectionQuantities = new Map<string, string>()) {
  render(
    <BoqItemPickerModal
      groups={GROUPS}
      sectionQuantities={sectionQuantities}
      draft={new Map()}
      onApply={onApply}
      onClose={vi.fn()}
    />,
  );
  return onApply;
}

describe("saf yardımcılar", () => {
  it("pickerRows her pozu grup adıyla düzleştirir", () => {
    const rows = pickerRows(GROUPS, new Map([["bi-1", "480"]]));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ groupName: "BETONARME", sectionQuantity: "480" });
    expect(rows[1].sectionQuantity).toBe("0");
  });

  it("arama poz NO ve TANIMDA çalışır, Türkçe küçültmeyle", () => {
    const [row] = pickerRows(GROUPS, new Map());
    expect(matchesSearch(row, "03.0")).toBe(true);
    expect(matchesSearch(row, "DÖŞEME")).toBe(true);
    expect(matchesSearch(row, "kalıp")).toBe(false);
    expect(matchesSearch(row, "   ")).toBe(true);
  });
});

describe("mockup'ın karşılığı olmayan öğesi SİLİNMEZ", () => {
  it("Dağıtım sütunu başlığı durur, hücrede GÖRÜNÜR gerekçe basılır", () => {
    renderPicker();
    expect(screen.getByRole("columnheader", { name: "Dağıtım" })).toBeInTheDocument();
    expect(screen.getAllByText(DISTRIBUTION_COLUMN_REASON).length).toBeGreaterThan(0);
  });

  it("tam küme değiştirme semantiği kullanıcıya SÖYLENİR", () => {
    renderPicker();
    expect(screen.getByText(OTHER_SECTIONS_PRESERVED_NOTE)).toBeInTheDocument();
  });
});

describe("süzgeç ve aşım kapısı", () => {
  it("'Yalnız kotası kalan pozlar' açıkken kotası tükenmiş poz listelenmez", async () => {
    renderPicker();
    expect(screen.queryByText("Tuğla Duvar")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Yalnız kotası kalan pozlar"));
    expect(screen.getByText("Tuğla Duvar")).toBeInTheDocument();
  });

  it("kotası tükenmiş poz, BU BÖLÜMÜN payı varsa süzgeçte KALIR", () => {
    renderPicker(vi.fn(), new Map([["bi-2", "800.000"]]));
    expect(screen.getByText("Tuğla Duvar")).toBeInTheDocument();
  });

  // 🔴 Kapı: aşımlı gövde hiç gönderilemez. Karşıt kanıt aşağıdaki testte —
  // geçerli miktar kapıdan GEÇER (her isteği reddeden bozuk kapı da bu
  // testi tek başına yeşil geçirirdi).
  it("aşım varken 'Ata' devre dışıdır ve gerekçe basılır", async () => {
    const user = userEvent.setup();
    renderPicker();
    const input = screen.getByLabelText("03.001 için bu bölüme atanacak miktar");
    await user.type(input, "900");
    expect(screen.getByRole("button", { name: /Pozu Ata|Ata/ })).toBeDisabled();
    expect(screen.getByText(/kota aşımı var/)).toBeInTheDocument();
  });

  it("KARŞIT KANIT: kalan kadar miktar kapıdan GEÇER ve onApply çağrılır", async () => {
    const user = userEvent.setup();
    const onApply = renderPicker();
    const input = screen.getByLabelText("03.001 için bu bölüme atanacak miktar");
    await user.type(input, "700");
    const apply = screen.getByRole("button", { name: "1 Pozu Ata" });
    expect(apply).toBeEnabled();
    await user.click(apply);
    expect(onApply).toHaveBeenCalledTimes(1);
    const [picked] = onApply.mock.calls[0] as [Map<string, string>];
    expect(picked.get("bi-1")).toBe("700");
  });

  it("geçersiz metin sessizce YOK SAYILMAZ — kapı kapanır", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.type(screen.getByLabelText("03.001 için bu bölüme atanacak miktar"), "abc");
    expect(screen.getByText(/geçersiz miktar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ata/ })).toBeDisabled();
  });
});
