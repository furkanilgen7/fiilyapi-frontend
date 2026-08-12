import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import { SalesTable } from "./SalesTable";
import type { SaleRow } from "./sales-labels";

/**
 * F-P8 T2 · SY 142-215 tablosunun DAVRANIŞ testleri. Saf modüllerin (etiket /
 * süzgeç / toplam) kendi testleri ayrıdır; burada RENDER edilmiş çıktının
 * kanıtladıkları var:
 *   · TOPLAM satırının İKİ kaynağı ekranda gerçekten değişiyor mu,
 *   · 🛑 satırın DETAY bağlantısı ve durum AKSİYONU basılmadığı (spec §2/K3).
 */

function row(overrides: Partial<SaleRow> = {}): SaleRow {
  return {
    id: "sl-1",
    status: "deed_transferred",
    unit_label: "A · Daire 12",
    customer_name: "Mehmet Aydın",
    customer_national_id: "12345678901",
    customer_tax_number: null,
    sale_price: "1120000.00",
    paid_amount: "1120000.00",
    remaining_amount: "0.00",
    payment_plan_type: "cash",
    installment_total: 0,
    installment_paid_count: 0,
    overdue_installment_count: 0,
    reservation_deposit: null,
    reservation_due_date: null,
    ...overrides,
  };
}

const SERVER_TOTALS = {
  count: 5,
  sale_price_total: "31420000.00",
  paid_total: "24820000.00",
  remaining_total: "6600000.00",
};

function renderTable(overrides: Partial<React.ComponentProps<typeof SalesTable>> = {}) {
  return render(
    <SalesTable
      rows={[row(), row({ id: "sl-2", status: "reservation", customer_name: "Zeynep Kara" })]}
      serverTotals={SERVER_TOTALS}
      statusFilter={undefined}
      onStatusFilterChange={vi.fn()}
      isLoading={false}
      isError={false}
      {...overrides}
    />,
  );
}

describe("SalesTable — sütunlar ve satır künyesi (149-166)", () => {
  it("YEDİ sütun mockup sırasıyla basılır", () => {
    renderTable();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Ünite",
      "Alıcı",
      "Satış Bedeli",
      "Tahsil Edilen",
      "Kalan",
      "Ödeme Planı",
      "Durum",
    ]);
  });

  it("satır sunucudan gelir; mockup'ın örnek satırları UYDURULMAZ", () => {
    renderTable({ rows: [row()] });
    expect(screen.getByText("A · Daire 12")).toBeInTheDocument();
    expect(screen.getByText("TCKN: 123****901")).toBeInTheDocument();
    // Mockup'ın sabit örnekleri sızmaz.
    expect(screen.queryByText("Kaya Market Ltd.")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------------ *
 * 🛑 KORUMA TESTLERİ — spec §2 / K3. Satış DETAY ekranı YOKTUR; bu ekran
 * activate / transfer-deed / cancel / pay aksiyonlarını HİÇ basmaz. Bir
 * gelecek dilim yanlışlıkla satıra link/menü eklerse burası KIRMIZI olur.
 * ------------------------------------------------------------------------ */
describe("SalesTable — detay ekranı / durum aksiyonu BASILMAZ", () => {
  it("satır DETAYA GİTMEZ: tablonun içinde hiç bağlantı yoktur", () => {
    renderTable();
    const table = screen.getByRole("table");
    expect(within(table).queryAllByRole("link")).toHaveLength(0);
  });

  it("satırda durum aksiyonu düğmesi YOKTUR (tablo içinde hiç düğme yok)", () => {
    renderTable();
    const table = screen.getByRole("table");
    expect(within(table).queryAllByRole("button")).toHaveLength(0);
  });

  it("aksiyon sözcüklerinin hiçbiri ekrana basılmaz", () => {
    renderTable();
    for (const forbidden of [/aktifleştir/i, /tapu devret/i, /iptal et/i, /tahsilat gir/i, /ödeme al/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });
});

/* ------------------------------------------------------------------------ *
 * TOPLAM satırının İKİ kaynağı — `sales-totals.ts`in ekrandaki karşılığı.
 * ------------------------------------------------------------------------ */
describe("SalesTable — tfoot'un iki kaynağı (205-215)", () => {
  it("süzgeç KAPALIYKEN sunucunun SÜZÜLMEMİŞ toplamı basılır (5 satış)", () => {
    renderTable({ statusFilter: undefined });
    const total = screen.getByTestId("satis-toplam");
    expect(total).toHaveTextContent("TOPLAM (5 satış)");
    expect(total).toHaveTextContent("31.420.000");
    // Kaynak sunucu olduğu için "yalnız görünenler" notu ÇIKMAZ.
    expect(screen.queryByTestId("satis-toplam-notu")).not.toBeInTheDocument();
  });

  // MUTASYON KANITI: yalnız `statusFilter` değişir; ekrandaki toplam sunucu
  // rakamından görünen satırların rakamına döner ve gerekçe görünür yazılır.
  it("süzgeç AÇIKKEN toplam GÖRÜNEN satırlardan türer ve gerekçesi basılır", () => {
    renderTable({
      rows: [row({ id: "sl-1", sale_price: "1120000.00" })],
      statusFilter: "deed_transferred",
    });
    const total = screen.getByTestId("satis-toplam");
    expect(total).toHaveTextContent("TOPLAM (1 satış)");
    expect(total).toHaveTextContent("1.120.000");
    expect(total).not.toHaveTextContent("31.420.000");
    expect(screen.getByTestId("satis-toplam-notu")).toHaveTextContent(
      /yalnızca süzgeçle görünen 1 satışı sayar/,
    );
  });

  it("hiç satır kalmadığında TOPLAM satırı basılmaz", () => {
    renderTable({ rows: [], statusFilter: undefined });
    expect(screen.queryByTestId("satis-toplam")).not.toBeInTheDocument();
  });
});

describe("SalesTable — durum süzgeci (146) İSTEMCİDE", () => {
  it("mockup'ın dört seçeneğini basar ('Tüm Durumlar' + üç durum)", () => {
    renderTable();
    const select = screen.getByLabelText("Durum filtresi");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Tüm Durumlar",
      "Tapulu",
      "Rezerve",
      "Vadesi Geçen",
    ]);
  });

  it("seçim üste bildirilir; 'Tüm Durumlar' süzgeci KALDIRIR", () => {
    const onStatusFilterChange = vi.fn();
    renderTable({ onStatusFilterChange });
    const select = screen.getByLabelText("Durum filtresi");

    fireEvent.change(select, { target: { value: "overdue" } });
    expect(onStatusFilterChange).toHaveBeenCalledWith("overdue");

    fireEvent.change(select, { target: { value: "" } });
    expect(onStatusFilterChange).toHaveBeenLastCalledWith(undefined);
  });

  it("süzgeç satırları ekranda daraltır (sunucuya yeni istek GEREKMEZ)", () => {
    renderTable({
      rows: [row({ id: "sl-1" }), row({ id: "sl-2", status: "reservation" })],
      statusFilter: "reservation",
    });
    expect(screen.queryByTestId("satis-row-sl-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("satis-row-sl-2")).toBeInTheDocument();
  });
});

describe("SalesTable — boş / yükleniyor / hata", () => {
  it("hiç satış yokken boş durum + form daveti basılır", () => {
    renderTable({ rows: [] });
    const empty = screen.getByTestId("satis-bos-durum");
    expect(empty).toHaveTextContent("Bu projede henüz satış kaydı yok.");
    expect(empty).toHaveTextContent("“+ Satış Kaydı” ile ilk satışı açın.");
  });

  it("süzgeç yüzünden boş kalan liste AYRI bir metin basar", () => {
    renderTable({ rows: [row()], statusFilter: "reservation" });
    expect(screen.getByTestId("satis-bos-durum")).toHaveTextContent(
      "Bu durumla eşleşen satış yok.",
    );
  });

  it("hata durumunda SUNUCUNUN cümlesi basılır (sabit cümle son çare)", () => {
    renderTable({
      rows: undefined,
      isError: true,
      errorMessage: "Bu projeye erişim yetkiniz yok.",
    });
    expect(screen.getByTestId("satis-bos-durum")).toHaveTextContent(
      "Bu projeye erişim yetkiniz yok.",
    );
  });

  it("yüklenirken sahte sıfır TOPLAM basılmaz", () => {
    renderTable({ rows: undefined, serverTotals: undefined, isLoading: true });
    expect(screen.queryByTestId("satis-toplam")).not.toBeInTheDocument();
    expect(screen.getByTestId("satis-bos-durum")).toHaveTextContent("yükleniyor");
  });
});
