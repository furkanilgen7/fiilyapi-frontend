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
  isRejectReasonReady,
  leaveOverrun,
  leaveRequestBlockReason,
  overrunDays,
  pendingTableHeading,
  previewLeaveDays,
  remainingBalanceText,
  seniorityText,
  usageCell,
} from "./leaves-derive";
import {
  BLOCK_REASON_DATE_ORDER,
  BLOCK_REASON_DOCUMENT_REQUIRED,
  BLOCK_REASON_MISSING_FIELDS,
  BLOCK_REASON_OVERRUN,
} from "./leaves-labels";

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

/* ═══ F-IZN T4 · form türetmeleri ══════════════════════════════════════════ */

describe("gün sayısı türetmesi (T 141-145 · KARAR 1)", () => {
  it("takvim günü, başlangıç ve bitiş DAHİL — sunucu formülünün ikizi", () => {
    // Mockup 135/139: 24.08 → 04.09 = 12 gün.
    expect(previewLeaveDays("2026-08-24", "2026-09-04")).toBe(12);
    expect(previewLeaveDays("2026-08-04", "2026-08-08")).toBe(5);
  });

  it("tek günlük izin 1'dir (0 DEĞİL)", () => {
    expect(previewLeaveDays("2026-08-04", "2026-08-04")).toBe(1);
  });

  it("ay/yıl sınırını aşan aralık doğru sayılır", () => {
    expect(previewLeaveDays("2026-12-31", "2027-01-02")).toBe(3);
  });

  it("DST geçişi gün sayısını KAYDIRMAZ (UTC ayrıştırma)", () => {
    // TR'de yaz saati 29 Mart 2026'da başlar; yerel saatte 23 saatlik gün çıkar.
    expect(previewLeaveDays("2026-03-28", "2026-03-30")).toBe(3);
  });

  it("ters tarih ve geçersiz/taşan girdi `null` döner (negatif gün BASILMAZ)", () => {
    expect(previewLeaveDays("2026-09-04", "2026-08-24")).toBeNull();
    expect(previewLeaveDays("", "2026-08-24")).toBeNull();
    expect(previewLeaveDays("2026-02-31", "2026-03-05")).toBeNull();
  });
});

describe("hak aşımı önizlemesi (T 149-158 · KARAR 4)", () => {
  const base = { days: 12, remaining: "8", deductsFromAnnual: true, startDate: "2026-08-24" };

  it("aşım varsa fark ve ÖNERİLEN bitiş tarihi hesaplanır (155)", () => {
    expect(leaveOverrun(base)).toEqual({
      requestedDays: 12,
      remainingDays: 8,
      overrunDays: 4,
      // 8 günlük izin 24.08'de başlarsa 31.08'de biter (başlangıç dahil).
      suggestedEndDate: "2026-08-31",
    });
  });

  it("kalan hak yetiyorsa uyarı YOKTUR (eşit gün de aşım değildir)", () => {
    expect(leaveOverrun({ ...base, days: 8 })).toBeNull();
    expect(leaveOverrun({ ...base, days: 3 })).toBeNull();
  });

  it("🔴 kalan hak BİLİNMİYORSA aşım İDDİA EDİLMEZ (fail-closed görüntüsü)", () => {
    expect(leaveOverrun({ ...base, remaining: null })).toBeNull();
    expect(leaveOverrun({ ...base, remaining: undefined })).toBeNull();
  });

  it("🔴 yıllık haktan DÜŞMEYEN tipte uyarı basılmaz (şema kanonu)", () => {
    expect(leaveOverrun({ ...base, deductsFromAnnual: false })).toBeNull();
  });

  it("gün hesaplanamıyorsa (ters tarih) aşım da hesaplanmaz", () => {
    expect(leaveOverrun({ ...base, days: null })).toBeNull();
  });

  it("kalan 1 günden azken öneri YOKTUR ama aşım DURUR", () => {
    const overrun = leaveOverrun({ ...base, remaining: "0" });
    expect(overrun?.overrunDays).toBe(12);
    expect(overrun?.suggestedEndDate).toBeNull();
  });
});

describe("red gerekçesi kapısı (R 104-128)", () => {
  it("dolu gerekçe geçer", () => {
    expect(isRejectReasonReady("Kalan izin hakkı yetersiz")).toBe(true);
  });

  it("🔴 boş dize DE yalnız boşluk DA geçmez (`strip()` sonrası boş → 422)", () => {
    expect(isRejectReasonReady("")).toBe(false);
    expect(isRejectReasonReady(" ")).toBe(false);
    expect(isRejectReasonReady("   \n\t ")).toBe(false);
  });
});

describe("talep formu kapısı (T 184-188)", () => {
  const ready = {
    personnelId: "per-1",
    leaveTypeId: "lt-1",
    startDate: "2026-08-24",
    endDate: "2026-08-26",
    requiresDocument: false,
    hasDocument: false,
    isOverrun: false,
  };

  it("eksiksiz form engelsizdir", () => {
    expect(leaveRequestBlockReason(ready)).toBeNull();
  });

  it("zorunlu alan eksikse gerekçe basılır", () => {
    expect(leaveRequestBlockReason({ ...ready, personnelId: "" })).toBe(
      BLOCK_REASON_MISSING_FIELDS,
    );
    expect(leaveRequestBlockReason({ ...ready, leaveTypeId: "" })).toBe(
      BLOCK_REASON_MISSING_FIELDS,
    );
  });

  it("ters tarih sunucuya BIRAKILMAZ — ekran söyler", () => {
    expect(leaveRequestBlockReason({ ...ready, endDate: "2026-08-01" })).toBe(
      BLOCK_REASON_DATE_ORDER,
    );
  });

  it("hak aşımında gönderim KAPALIdır (187)", () => {
    expect(leaveRequestBlockReason({ ...ready, isOverrun: true })).toBe(BLOCK_REASON_OVERRUN);
  });

  it("🔴 KARAR 3 · belge YALNIZ `requires_document` tiplerde zorunludur", () => {
    expect(leaveRequestBlockReason({ ...ready, requiresDocument: true })).toBe(
      BLOCK_REASON_DOCUMENT_REQUIRED,
    );
    expect(
      leaveRequestBlockReason({ ...ready, requiresDocument: true, hasDocument: true }),
    ).toBeNull();
    // Belge istemeyen tipte dosyasız form ENGELLENMEZ.
    expect(leaveRequestBlockReason({ ...ready, requiresDocument: false })).toBeNull();
  });
});
