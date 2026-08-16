import { describe, it, expect } from "vitest";

import type { LeaveBalanceResponse, LeaveRequestResponse } from "@/lib/api/hooks/useLeaves";

import {
  buildBalanceIndex,
  carriedOverText,
  deriveRemainingCell,
  entitlementText,
  formatDateDots,
  hasCarryoverRisk,
  isApprovalBlocked,
  overrunDays,
  pendingTableHeading,
  remainingBalanceText,
  seniorityText,
  usageCell,
} from "./leaves-derive";

/**
 * F-IZN T3 · saf türetme ikizi.
 *
 * 🔴 AYRIŞMA NOKTASI KURALI: hiçbir test, yanlış uygulamanın da geçeceği bir
 * kurulumda yazılmaz. Bu yüzden `remaining = 0` ile `remaining = null` AYRI
 * testlerdir ve FARKLI çıktı verirler; join testinde eşleşen ve eşleşmeyen
 * personel BİRLİKTE bulunur; `total` satır sayısından FARKLIdır.
 */

function balance(overrides: Partial<LeaveBalanceResponse> = {}): LeaveBalanceResponse {
  return {
    personnel_id: "per-1",
    personnel_name: "Ayşe Demir",
    year: 2026,
    hire_date: "2024-07-01",
    seniority_years: 2,
    seniority_months: 1,
    annual_entitlement: 14,
    carried_over: "0",
    used: 6,
    remaining: "11",
    usage_pct: 35,
    ...overrides,
  };
}

function request(overrides: Partial<LeaveRequestResponse> = {}): LeaveRequestResponse {
  return {
    id: "lr-1",
    personnel_id: "per-1",
    personnel_name: "Ayşe Demir",
    personnel_trade: "Büro Şefi",
    leave_type_id: "lt-1",
    leave_type_name: "Yıllık",
    leave_type_color: "#2563eb",
    deducts_from_annual: true,
    start_date: "2026-08-04",
    end_date: "2026-08-08",
    days: 5,
    note: "Aile ziyareti",
    document_id: null,
    status: "pending",
    decided_by: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-20T09:00:00Z",
    ...overrides,
  };
}

describe("K4 · kalan hak istemci tarafı JOIN'i (66/77)", () => {
  // Ayrışma: eşleşen VE eşleşmeyen personel AYNI kurulumda bulunur — yalnız
  // eşleşen olsaydı "her zaman ilk bakiyeyi bas" hatası da geçerdi.
  const balances = buildBalanceIndex([
    balance({ personnel_id: "per-1", remaining: "9" }),
    balance({ personnel_id: "per-2", remaining: "11" }),
  ]);

  it("eşleşen personelin kalanı `balances[]`ten gelir", () => {
    expect(deriveRemainingCell(request({ personnel_id: "per-2" }), balances)).toEqual({
      label: "11 gün",
      tone: "ok",
    });
  });

  it("bakiyesi OLMAYAN personelde 0 DEĞİL '—' basılır", () => {
    const cell = deriveRemainingCell(request({ personnel_id: "per-yok" }), balances);
    expect(cell).toEqual({ label: "—", tone: "unknown" });
    expect(cell.label).not.toBe("0");
  });

  it("`remaining = null` bilinmiyordur → '—'", () => {
    const nullIndex = buildBalanceIndex([balance({ personnel_id: "per-1", remaining: null })]);
    expect(deriveRemainingCell(request(), nullIndex).label).toBe("—");
  });

  it("`remaining = 0` GERÇEK sıfırdır → '0 gün' (null ile AYNI ŞEY DEĞİL)", () => {
    const zeroIndex = buildBalanceIndex([balance({ personnel_id: "per-1", remaining: "0" })]);
    const cell = deriveRemainingCell(request({ days: 1 }), zeroIndex);
    expect(cell.label).toBe("0 gün");
    expect(cell.label).not.toBe("—");
    expect(cell.tone).toBe("exceeded");
  });
});

describe("K9 · yıllık haktan düşmeyen tip (87)", () => {
  const balances = buildBalanceIndex([balance({ personnel_id: "per-1", remaining: "9" })]);

  it("`deducts_from_annual = false` satırda 'Düşmez' basılır", () => {
    const cell = deriveRemainingCell(request({ deducts_from_annual: false }), balances);
    expect(cell).toEqual({ label: "Düşmez", tone: "not-deducted" });
  });

  it("'Düşmez' ile '—' KARIŞMAZ — ikisi ayrı anlamdır", () => {
    const notDeducted = deriveRemainingCell(request({ deducts_from_annual: false }), balances);
    const unknown = deriveRemainingCell(
      request({ personnel_id: "per-yok" }),
      buildBalanceIndex([]),
    );
    expect(notDeducted.label).not.toBe(unknown.label);
  });

  it("düşmeyen tipte bakiye VARSA bile hak aşımı iddia edilmez", () => {
    const blocked = isApprovalBlocked(
      request({ deducts_from_annual: false, days: 30 }),
      balances,
    );
    expect(blocked).toBe(false);
  });
});

describe("hak aşımı koşulu (96-99)", () => {
  const balances = buildBalanceIndex([balance({ personnel_id: "per-1", remaining: "8" })]);

  it("gün > kalan ise onay ENGELLİDİR", () => {
    expect(isApprovalBlocked(request({ days: 12 }), balances)).toBe(true);
    expect(overrunDays(request({ days: 12 }), balances)).toBe(4);
  });

  it("gün = kalan sınırında onay SERBESTtir (kapanan aralık)", () => {
    expect(isApprovalBlocked(request({ days: 8 }), balances)).toBe(false);
    expect(overrunDays(request({ days: 8 }), balances)).toBeNull();
  });

  it("kalan BİLİNMİYORSA aşım iddia edilmez (NULL-EŞİK)", () => {
    const unknownIndex = buildBalanceIndex([balance({ personnel_id: "per-1", remaining: null })]);
    expect(isApprovalBlocked(request({ days: 99 }), unknownIndex)).toBe(false);
  });
});

describe("K5 · tablo başlığının sayısı (56)", () => {
  it("sayı `total`dan gelir, satır sayısından DEĞİL", () => {
    // Ayrışma: mockup 6 der ve 4 satır çizer. Fikstürde de ikisi FARKLIDIR;
    // eşit olsalardı bu test hiçbir şey kanıtlamazdı.
    const rows = [request({ id: "a" }), request({ id: "b" }), request({ id: "c" })];
    const total = 6;
    expect(rows).toHaveLength(3);
    expect(pendingTableHeading(total)).toBe("Onay Bekleyen İzin Talepleri (6)");
    expect(pendingTableHeading(total)).not.toContain(`(${rows.length})`);
  });

  it("sayı henüz yokken parantez HİÇ basılmaz (sahte 0 yok)", () => {
    expect(pendingTableHeading(undefined)).toBe("Onay Bekleyen İzin Talepleri");
  });
});

describe("kıdem metni (135/162)", () => {
  it("yıl + ay birlikte yazılır", () => {
    expect(seniorityText(2, 1)).toBe("2 yıl 1 ay");
  });

  it("yıl 0 ise YALNIZ ay yazılır (162)", () => {
    expect(seniorityText(0, 5)).toBe("5 ay");
  });

  it("ay 0 ise YALNIZ yıl yazılır", () => {
    expect(seniorityText(3, 0)).toBe("3 yıl");
  });

  it("`hire_date` yoksa kıdem bilinmiyordur → '—' (0 ay DEĞİL)", () => {
    expect(seniorityText(null, null)).toBe("—");
    expect(seniorityText(0, 0)).toBe("0 ay");
  });
});

describe("bakiye hücreleri (126-130 · 163-167)", () => {
  it("yıllık hak NULL ise '—' basılır (163)", () => {
    expect(entitlementText(null)).toBe("—");
    expect(entitlementText(14)).toBe("14");
  });

  it("kalan NULL ise 'Hak yok' basılır, 0 BASILMAZ (166)", () => {
    expect(remainingBalanceText(null)).toBe("Hak yok");
    expect(remainingBalanceText(null)).not.toBe("0");
  });

  it("kalan GERÇEKTEN 0 ise '0' basılır ('Hak yok' DEĞİL)", () => {
    expect(remainingBalanceText("0")).toBe("0");
  });

  it("devreden, hak hesaplanamayan satırda '—'; hesaplananda sayıdır (146/164)", () => {
    expect(carriedOverText(balance({ annual_entitlement: null, carried_over: "0" }))).toBe("—");
    expect(carriedOverText(balance({ carried_over: "0" }))).toBe("0");
    expect(carriedOverText(balance({ carried_over: "6" }))).toBe("6");
  });

  it("devreden gün varsa yanma riski vardır (155/158)", () => {
    expect(hasCarryoverRisk(balance({ carried_over: "6" }))).toBe(true);
    expect(hasCarryoverRisk(balance({ carried_over: "0" }))).toBe(false);
  });
});

describe("kullanım hücresi (140/158/167)", () => {
  it("yüzde metni basılır ve çubuk çizilir (140)", () => {
    expect(usageCell(balance({ usage_pct: 35, carried_over: "0" }))).toEqual({
      pct: 35,
      text: "%35 kullanıldı",
    });
  });

  it("devreden riski varsa yüzde yerine uyarı yazılır, çubuk KALIR (158)", () => {
    expect(usageCell(balance({ usage_pct: 60, carried_over: "6" }))).toEqual({
      pct: 60,
      text: "Devreden yanma riski",
    });
  });

  it("`usage_pct` NULL ise çubuk HİÇ çizilmez (167)", () => {
    expect(usageCell(balance({ usage_pct: null, annual_entitlement: null }))).toEqual({
      pct: null,
      text: "1 yıl dolunca hak kazanır",
    });
  });

  it("yüzde 100'ü aşsa bile çubuk taşmaz", () => {
    expect(usageCell(balance({ usage_pct: 140, carried_over: "0" })).pct).toBe(100);
  });
});

describe("TR tarih biçimi (74-75)", () => {
  it("`YYYY-MM-DD` → `GG.AA.YYYY`", () => {
    expect(formatDateDots("2026-08-04")).toBe("04.08.2026");
  });
});
