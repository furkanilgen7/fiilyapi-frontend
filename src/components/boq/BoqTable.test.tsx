import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { BoqTable } from "./BoqTable";
import type { BoqGroup, BoqItem, BoqTotals } from "@/lib/api/hooks/useBoq";

function item(overrides: Partial<BoqItem> = {}): BoqItem {
  return {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    code: "01.001",
    description: "Kazı (Makine ile)",
    unit: "m³",
    quantity: "1240.000",
    unit_price: "280.00",
    amount: "347200.00",
    sort_order: 0,
    progress_pct: { available: false, value: null, pending_module: "progress_payments" },
    ...overrides,
  };
}

// sort_order KASITLI olarak 10/20/30 — mockup 1-2-3 kesintisiz sayar (spec §5.2).
const GROUPS: BoqGroup[] = [
  {
    id: "gggggggg-0000-0000-0000-000000000001",
    name: "Toprak ve Temel İşleri",
    sort_order: 10,
    group_total: "471900.00",
    items: [item(), item({ id: "aaaaaaaa-0000-0000-0000-000000000002", code: "01.002" })],
  },
  {
    id: "gggggggg-0000-0000-0000-000000000002",
    name: "Betonarme İşleri",
    sort_order: 20,
    group_total: "9250000.00",
    items: [item({ id: "aaaaaaaa-0000-0000-0000-000000000003", code: "02.001" })],
  },
  {
    id: "gggggggg-0000-0000-0000-000000000003",
    name: "Duvar ve Kaplama İşleri",
    sort_order: 30,
    group_total: "0.00",
    items: [],
  },
];

// GENEL TOPLAM satırının kaynağı (spec §5.5): tutar GERÇEK, yüzde YER TUTUCU.
// `grand_total` kasıtlı olarak kalemlerin toplamı DEĞİL — frontend'in hesap
// yapmadığı, backend değerini bastığı testle sabitlenir.
function totals(overrides: Partial<BoqTotals> = {}): BoqTotals {
  return {
    contract_total: { available: false, value: null, pending_module: "contracts" },
    realized_total: { available: false, value: null, pending_module: "progress_payments" },
    remaining_total: { available: false, value: null, pending_module: "progress_payments" },
    revision_total: { available: false, value: null, pending_module: "contracts" },
    grand_total: "12399900.00",
    grand_progress_pct: { available: false, value: null, pending_module: "progress_payments" },
    ...overrides,
  };
}

const TOTALS = totals();

const COLUMNS = ["Poz No", "İş Kalemi Tarifi", "Birim", "Miktar", "Birim Fiyat", "Tutar", "Gerç. %"];

/** thead'in sütun başlıkları — grup başlıkları da `columnheader` rolündedir. */
function columnHeads(): HTMLElement[] {
  return within(screen.getAllByRole("row")[0]).getAllByRole("columnheader");
}

function groupHeads(): HTMLElement[] {
  return screen.getAllByTestId("boq-group");
}

describe("BoqTable — başlık ve semantik (mockup 92–103, spec §10)", () => {
  it("7 sütun başlığı mockup metinleriyle ve scope=col ile basılır", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const heads = columnHeads();
    expect(heads.map((h) => h.textContent)).toEqual(COLUMNS);
    for (const head of heads) expect(head).toHaveAttribute("scope", "col");
  });

  it("tabloya 8. sütun eklenmez (mockup düzeni korunur)", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(columnHeads()).toHaveLength(7);
  });

  it("ekran okuyucu için sr-only caption taşır", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const caption = screen.getByText("İş kalemleri listesi");
    expect(caption.tagName).toBe("CAPTION");
    expect(caption).toHaveClass("sr-only");
  });

  // Grup, altındaki satırların başlığıdır: <td> değil <th scope="colgroup">
  // (spec §10). HTML-ARIA eşlemesinde scope=colgroup rolü `columnheader`dır.
  it("grup başlığı th scope=colgroup olarak basılır", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const groupHead = groupHeads()[0];
    expect(groupHead.tagName).toBe("TH");
    expect(groupHead).toHaveAttribute("scope", "colgroup");
    expect(groupHead).toHaveAttribute("colspan", "7");
  });
});

describe("BoqTable — gruplar ve satırlar (spec §5.1–5.3)", () => {
  it("grup numaraları 1. 2. 3. olarak dizinden türetilir (sort_order 10/20/30 iken bile)", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const headers = groupHeads().map((h) => h.textContent);
    expect(headers).toEqual([
      "1. Toprak ve Temel İşleri",
      "2. Betonarme İşleri",
      "3. Duvar ve Kaplama İşleri",
    ]);
  });

  it("büyük harfe çevirme JS ile yapılmaz (CSS text-transform)", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(groupHeads()[0]).toHaveTextContent("1. Toprak ve Temel İşleri");
  });

  it("grup ve kalem sırası yüklerden geldiği gibi korunur, yeniden sıralanmaz", () => {
    const shuffled: BoqGroup[] = [GROUPS[1], GROUPS[0], GROUPS[2]];
    render(<BoqTable groups={shuffled} totals={TOTALS} />);
    expect(groupHeads().map((h) => h.textContent)).toEqual([
      "1. Betonarme İşleri",
      "2. Toprak ve Temel İşleri",
      "3. Duvar ve Kaplama İşleri",
    ]);
  });

  it("tutar backend'den basılır, miktar × fiyat olarak yeniden hesaplanmaz", () => {
    const groups: BoqGroup[] = [
      {
        ...GROUPS[0],
        items: [item({ quantity: "2.000", unit_price: "100.00", amount: "999.00" })],
      },
    ];
    render(<BoqTable groups={groups} totals={TOTALS} />);
    expect(screen.getByText("999")).toBeInTheDocument();
    expect(screen.queryByText("200")).not.toBeInTheDocument();
  });

  it("miktar ve birim fiyat ₺ sembolü olmadan biçimlenir (mockup 114–116)", () => {
    render(<BoqTable groups={[GROUPS[0]]} totals={TOTALS} />);
    const row = screen.getAllByRole("row").find((r) => within(r).queryByText("01.001"));
    expect(row).toBeDefined();
    expect(row?.textContent).toContain("1.240");
    expect(row?.textContent).toContain("280");
    expect(row?.textContent).toContain("347.200");
    expect(row?.textContent).not.toContain("₺");
  });

  it("kalemi olmayan grup için başlık basılır, uydurma boş satır eklenmez", () => {
    render(<BoqTable groups={[GROUPS[2]]} totals={TOTALS} />);
    expect(groupHeads()[0]).toHaveTextContent("1. Duvar ve Kaplama İşleri");
    // 1 baslik satiri (thead) + 1 grup satiri + 1 GENEL TOPLAM satiri = 3;
    // kalem satiri yok.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("grup alt-toplam satırı basılmaz (mockup'ta yok)", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(screen.queryByText("471.900")).not.toBeInTheDocument();
    expect(screen.queryByText("9.250.000")).not.toBeInTheDocument();
  });
});

describe("BoqTable — Gerç. % yer tutucu sütunu (spec §5.4)", () => {
  it("Gerç. % hücreleri — basar ve sr-only bekleme metnini taşır", () => {
    render(<BoqTable groups={[GROUPS[1]]} totals={TOTALS} />);
    const cell = screen.getByTestId("boq-pct");
    expect(cell).toHaveTextContent("—");
    expect(cell).toHaveAttribute("title", "Hakediş modülüyle birlikte gelir");
    expect(within(cell).getByText("Hakediş modülüyle birlikte gelir")).toHaveClass("sr-only");
  });

  it("Gerç. % sütun başlığı kaybolmaz", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(screen.getByRole("columnheader", { name: "Gerç. %" })).toBeInTheDocument();
  });

  it("yüzde hücresi nötr basılır — eşik/renk sınıfı taşımaz (P7'ye bırakıldı)", () => {
    render(<BoqTable groups={[GROUPS[1]]} totals={TOTALS} />);
    expect(screen.getByTestId("boq-pct").className).toBe("boq-table__pct boq-table__pct--pending");
  });

  it("mockup'taki renkli yüzde rozetleri hiç render edilmez", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(screen.queryByText(/^%\d/)).not.toBeInTheDocument();
  });
});

describe("BoqTable — GENEL TOPLAM satırı (mockup 174–177, spec §5.5)", () => {
  /** tfoot'un tek satırı — thead/tbody satırlarından ayırt edilir. */
  function totalRow(): HTMLElement {
    return screen.getByTestId("boq-total-row");
  }

  it("GENEL TOPLAM tutarı grand_total'dan formatAmount ile basılır", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(screen.getByTestId("boq-total-amount")).toHaveTextContent("12.399.900");
  });

  it("toplam frontend'de hesaplanmaz, backend değeri basılır", () => {
    // Kalemlerin tutarı 347.200 × 3 = 1.041.600; ekran yine de backend'in
    // gonderdigi 12.399.900'u basar.
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(screen.getByTestId("boq-total-amount")).not.toHaveTextContent("1.041.600");
  });

  it("toplam tutar ₺ sembolü basmaz (mockup 176)", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(totalRow().textContent).not.toContain("₺");
  });

  it("ilk hücre colSpan=5 ve scope=row", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const label = within(totalRow()).getByText("GENEL TOPLAM");
    expect(label.tagName).toBe("TH");
    expect(label).toHaveAttribute("colspan", "5");
    expect(label).toHaveAttribute("scope", "row");
  });

  it("yüzde hücresi — basar ve hakediş bekleme metnini taşır", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    const cell = screen.getByTestId("boq-total-pct");
    expect(cell).toHaveTextContent("—");
    expect(cell).toHaveAttribute("title", "Hakediş modülüyle birlikte gelir");
    expect(within(cell).getByText("Hakediş modülüyle birlikte gelir")).toHaveClass("sr-only");
  });

  // Mockup 177 `%75` basiyor; bu dilimde veri yok, sahte yuzde UYDURULMAZ.
  it("mockup'ın %75 değeri uydurulmaz", () => {
    render(<BoqTable groups={GROUPS} totals={TOTALS} />);
    expect(totalRow().textContent).not.toMatch(/%\d/);
  });

  it("boş BOQ'da tfoot yine basılır ve 0 gösterir", () => {
    render(<BoqTable groups={[]} totals={totals({ grand_total: "0.00" })} />);
    expect(screen.getByTestId("boq-total-amount")).toHaveTextContent("0");
    expect(within(totalRow()).getByText("GENEL TOPLAM")).toBeInTheDocument();
  });
});

describe("BoqTable — boş durum (spec §9)", () => {
  it("groups boşken boş durum metni ve + İş Kalemi butonu basılır, thead korunur", () => {
    render(<BoqTable groups={[]} totals={TOTALS} />);
    expect(columnHeads().map((h) => h.textContent)).toEqual(COLUMNS);
    expect(screen.getByText("Bu şantiyede henüz iş kalemi tanımlanmadı.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ İş Kalemi" })).toBeInTheDocument();
  });

  it("boş durum satırı tablonun tam genişliğini kaplar", () => {
    render(<BoqTable groups={[]} totals={TOTALS} />);
    const cell = screen.getByTestId("boq-empty");
    expect(cell).toHaveAttribute("colspan", "7");
  });
});
