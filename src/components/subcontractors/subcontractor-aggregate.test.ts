import { describe, it, expect } from "vitest";

import type { ContractListItem } from "@/lib/api/hooks/useContracts";
import type { SubcontractorListItem } from "@/lib/api/hooks/useSubcontractors";
import type { SubcontractorProgressPaymentListItem } from "@/lib/api/hooks/useSubcontractorProgressPayments";

import {
  buildSubcontractorDirectory,
  filterSubcontractorRows,
  type BuildDirectoryInput,
} from "./subcontractor-aggregate";

function firm(overrides: Partial<SubcontractorListItem> = {}): SubcontractorListItem {
  return {
    id: "sub-1",
    name: "Akın İnşaat Ltd. Şti.",
    tax_number: "1234567890",
    contact_person: "Akın Bey",
    phone: "0212 555 00 01",
    email: null,
    category: "Betonarme",
    is_active: true,
    ...overrides,
  };
}

function contract(overrides: Partial<ContractListItem> = {}): ContractListItem {
  return {
    id: "sc-1",
    title: "Kaba Yapı",
    contract_no: "TSD-001",
    counterparty_name: "Akın İnşaat Ltd. Şti.",
    amount: "3000000.00",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    progress_pct: null,
    status: "active",
    is_draft: false,
    ...overrides,
  };
}

function payment(
  overrides: Partial<SubcontractorProgressPaymentListItem> = {},
): SubcontractorProgressPaymentListItem {
  return {
    id: "scpp-1",
    contract_id: "sc-1",
    project_id: "p-1",
    project_name: "Güneşkent",
    subcontractor_name: "Akın İnşaat Ltd. Şti.",
    contract_no: "TSD-001",
    work_category: "Betonarme",
    sequence_no: 1,
    period_year: 2026,
    period_month: 8,
    description: null,
    status: "paid",
    section_id: null,
    contract_site_id: null,
    created_at: "2026-08-01T00:00:00Z",
    gross_total: "1000000.00",
    net_total: "900000.00",
    is_revision_required: false,
    ...overrides,
  };
}

function build(overrides: Partial<BuildDirectoryInput> = {}) {
  return buildSubcontractorDirectory({
    subcontractors: [],
    contracts: [],
    payments: [],
    isPaymentTruncated: false,
    currentYear: 2026,
    currentMonth: 8,
    ...overrides,
  });
}

describe("buildSubcontractorDirectory · üç kaynaklı istemci agregasyonu", () => {
  it("firma başına Aktif Sözl. / Bedel / Ödenen / Bekleyen değerlerini birleştirir", () => {
    const directory = build({
      subcontractors: [firm(), firm({ id: "sub-2", name: "Yılmaz Elektrik A.Ş.", category: "Elektrik" })],
      contracts: [
        contract({ id: "sc-1", amount: "3000000.00", status: "active" }),
        contract({ id: "sc-2", amount: "1820000.00", status: "completed" }),
        contract({
          id: "sc-9",
          counterparty_name: "Yılmaz Elektrik A.Ş.",
          amount: "1240000.00",
          status: "active",
        }),
      ],
      payments: [
        payment({ id: "a", contract_id: "sc-1", status: "paid", net_total: "2000000.00" }),
        payment({ id: "b", contract_id: "sc-2", status: "paid", net_total: "940000.00" }),
        payment({
          id: "c",
          contract_id: "sc-1",
          status: "pending_approval",
          net_total: "1240000.00",
        }),
        payment({
          id: "d",
          contract_id: "sc-9",
          subcontractor_name: "Yılmaz Elektrik A.Ş.",
          status: "paid",
          net_total: "760000.00",
        }),
      ],
    });

    const [akin, yilmaz] = directory.rows;
    expect(akin.name).toBe("Akın İnşaat Ltd. Şti.");
    // Yalnız `active` sözleşmeler sayılır (sc-2 `completed`).
    expect(akin.activeContractCount).toBe(1);
    // Bedel taslak olmayan TÜM sözleşmelerin toplamıdır.
    expect(akin.contractTotal).toBe(4_820_000);
    expect(akin.paidTotal).toBe(2_940_000);
    expect(akin.pendingTotal).toBe(1_240_000);

    expect(yilmaz.activeContractCount).toBe(1);
    expect(yilmaz.contractTotal).toBe(1_240_000);
    expect(yilmaz.paidTotal).toBe(760_000);
    expect(yilmaz.pendingTotal).toBe(0);
  });

  it("4 KPI'ı aynı kaynaklardan üretir (dönem filtresi + onay bekleyen sayısı)", () => {
    const directory = build({
      subcontractors: [firm(), firm({ id: "sub-2", name: "Yılmaz Elektrik A.Ş." })],
      contracts: [
        contract({ id: "sc-1", status: "active" }),
        contract({ id: "sc-2", status: "on_hold" }),
      ],
      payments: [
        // Bu ay (2026-08) → "Bu Ay Ödeme"ye girer.
        payment({ id: "a", period_year: 2026, period_month: 8, net_total: "4820000.00" }),
        // Geçen ay → girmez.
        payment({ id: "b", period_year: 2026, period_month: 7, net_total: "1000000.00" }),
        payment({ id: "c", status: "pending_approval", period_month: 7 }),
        payment({ id: "d", status: "pending_approval", period_month: 6 }),
        payment({ id: "e", status: "pending_approval", period_month: 5 }),
      ],
    });

    expect(directory.summary.totalCount).toBe(2);
    expect(directory.summary.activeContractCount).toBe(1);
    expect(directory.summary.monthPaymentTotal).toBe(4_820_000);
    expect(directory.summary.pendingApprovalCount).toBe(3);
  });

  it("taslak sözleşme ne aktif sayılır ne de bedele girer", () => {
    const directory = build({
      subcontractors: [firm()],
      contracts: [
        contract({ id: "sc-1", amount: "1000.00", status: "active", is_draft: true }),
        contract({ id: "sc-2", amount: "500.00", status: "active", is_draft: false }),
      ],
    });
    expect(directory.rows[0].activeContractCount).toBe(1);
    expect(directory.rows[0].contractTotal).toBe(500);
    expect(directory.summary.activeContractCount).toBe(1);
  });

  it("KIRPILMA: hakediş listesi eksikse para değerleri PENDING'e düşer", () => {
    const directory = build({
      subcontractors: [firm()],
      contracts: [contract()],
      payments: [payment({ net_total: "900000.00" })],
      isPaymentTruncated: true,
    });

    expect(directory.isPaymentPending).toBe(true);
    // Hakedişten TÜREYEN değerler basılmaz…
    expect(directory.rows[0].paidTotal).toBeNull();
    expect(directory.rows[0].pendingTotal).toBeNull();
    expect(directory.summary.monthPaymentTotal).toBeNull();
    expect(directory.summary.pendingApprovalCount).toBeNull();
    // …ama sözleşme türevleri SAYFALANMAYAN uçtan geldiği için sağlam kalır.
    expect(directory.rows[0].contractTotal).toBe(3_000_000);
    expect(directory.rows[0].activeContractCount).toBe(1);
  });

  it("adı hiçbir firmayla eşleşmeyen sözleşme sessizce yutulmaz", () => {
    const directory = build({
      subcontractors: [firm()],
      contracts: [
        contract({ id: "sc-1" }),
        contract({ id: "sc-3", counterparty_name: "Kayıtsız Boya A.Ş.", amount: "999.00" }),
      ],
    });
    expect(directory.orphanContractCount).toBe(1);
    expect(directory.rows[0].contractTotal).toBe(3_000_000);
    // KPI global sayımdır: eşleşmeyen sözleşme de aktiftir.
    expect(directory.summary.activeContractCount).toBe(2);
  });

  it("satır linki deterministiktir: aktif+taslak-olmayan sözleşme kazanır", () => {
    const directory = build({
      subcontractors: [firm()],
      contracts: [
        contract({ id: "sc-draft", contract_no: "A", is_draft: true }),
        contract({ id: "sc-done", contract_no: "B", status: "completed" }),
        contract({ id: "sc-live", contract_no: "C", status: "active" }),
      ],
    });
    expect(directory.rows[0].detailContractId).toBe("sc-live");
  });

  it("hiç sözleşmesi olmayan firmanın detay hedefi yoktur", () => {
    const directory = build({ subcontractors: [firm()] });
    expect(directory.rows[0].detailContractId).toBeNull();
    expect(directory.rows[0].activeContractCount).toBe(0);
    expect(directory.rows[0].contractTotal).toBe(0);
  });

  it("kategori seçenekleri GERÇEK veriden türer, tekilleşir ve sıralanır", () => {
    const directory = build({
      subcontractors: [
        firm({ id: "1", name: "A", category: "Elektrik" }),
        firm({ id: "2", name: "B", category: "Betonarme" }),
        firm({ id: "3", name: "C", category: "Elektrik" }),
        firm({ id: "4", name: "D", category: null }),
      ],
    });
    expect(directory.categories).toEqual(["Betonarme", "Elektrik"]);
  });
});

describe("filterSubcontractorRows · istemci arama/kategori süzmesi", () => {
  const directory = build({
    subcontractors: [
      firm({ id: "1", name: "Akın İnşaat Ltd. Şti.", tax_number: "1234567890", category: "Betonarme" }),
      firm({ id: "2", name: "Yılmaz Elektrik A.Ş.", tax_number: "9876543210", category: "Elektrik" }),
    ],
  });

  it("ada göre büyük/küçük harf duyarsız süzer", () => {
    const rows = filterSubcontractorRows(directory.rows, { query: "yilmaz", category: "" });
    expect(rows).toHaveLength(0);
    const found = filterSubcontractorRows(directory.rows, { query: "YILMAZ", category: "" });
    expect(found.map((r) => r.id)).toEqual(["2"]);
  });

  it("VKN ile de eşleşir", () => {
    const rows = filterSubcontractorRows(directory.rows, { query: "12345", category: "" });
    expect(rows.map((r) => r.id)).toEqual(["1"]);
  });

  it("kategori süzgeci tam eşleşmedir; boş seçim hepsini gösterir", () => {
    expect(
      filterSubcontractorRows(directory.rows, { query: "", category: "Elektrik" }).map((r) => r.id),
    ).toEqual(["2"]);
    expect(filterSubcontractorRows(directory.rows, { query: "", category: "" })).toHaveLength(2);
  });

  it("arama ve kategori birlikte uygulanır", () => {
    expect(
      filterSubcontractorRows(directory.rows, { query: "Akın", category: "Elektrik" }),
    ).toHaveLength(0);
  });
});
