import { describe, expect, it } from "vitest";

import type { LandShareContract, LandShareValueBalance } from "@/lib/api/hooks/useLandShare";

import {
  ALLOCATION_VERDICT_OFF_TITLE,
  ALLOCATION_VERDICT_OK_TITLE,
  ALLOCATION_VERDICT_UNCOMPUTABLE_TITLE,
} from "./constants";
import { valueBalanceVerdict } from "./value-balance";

const CONTRACT: LandShareContract = {
  landowner_name: "Yılmaz Ailesi",
  our_share_pct: "55.00",
  owner_share_pct: "45.00",
  contract_no: "KKS-2026-001",
  notary_date: null,
  land_area_m2: null,
  construction_area_m2: null,
  delivery_date: null,
  daily_penalty: null,
  guarantee_amount: null,
};

function balance(overrides: Partial<LandShareValueBalance> = {}): LandShareValueBalance {
  return {
    our_value: "26400000",
    owner_value: "21100000",
    assigned_value_total: "47500000",
    our_actual_pct: "55.6",
    owner_actual_pct: "44.4",
    deviation_pct: "0.6",
    tolerance_pct: "2.00",
    is_within_tolerance: true,
    ...overrides,
  };
}

describe("valueBalanceVerdict — PG 264-266 hüküm şeridi", () => {
  it("tolerans içindeyse ONAY hükmü verir ve PG 266 cümlesini kurar", () => {
    const verdict = valueBalanceVerdict(CONTRACT, balance());
    expect(verdict.kind).toBe("ok");
    expect(verdict.title).toBe(ALLOCATION_VERDICT_OK_TITLE);
    expect(verdict.detail).toContain("%55/%45");
    expect(verdict.detail).toContain("%55,6/%44,4");
    expect(verdict.detail).toContain("%0,6");
  });

  it("tolerans aşıldıysa hüküm RET olur — yeşil şerit BASILMAZ", () => {
    const verdict = valueBalanceVerdict(
      CONTRACT,
      balance({
        our_actual_pct: "62.0",
        owner_actual_pct: "38.0",
        deviation_pct: "7.0",
        is_within_tolerance: false,
      }),
    );
    expect(verdict.kind).toBe("off");
    expect(verdict.title).toBe(ALLOCATION_VERDICT_OFF_TITLE);
    expect(verdict.detail).toContain("%7");
  });
});

describe("🔴 HESAPLANAMAZ hâl — `null` sıfır DEĞİLDİR, 'uygun' HİÇ DEĞİLDİR", () => {
  it("`is_within_tolerance: null` ONAY hükmü ÜRETMEZ", () => {
    // Bu, derleyicinin GÖRMEDİĞİ hata sınıfıdır: tip sistemi alanın var
    // olduğunu zorlar, `null`u "yanlış" saymanın yanlış olduğunu SÖYLEMEZ.
    const verdict = valueBalanceVerdict(
      CONTRACT,
      balance({
        our_actual_pct: null,
        owner_actual_pct: null,
        deviation_pct: null,
        is_within_tolerance: null,
      }),
    );
    expect(verdict.kind).toBe("uncomputable");
    expect(verdict.kind).not.toBe("ok");
    expect(verdict.title).toBe(ALLOCATION_VERDICT_UNCOMPUTABLE_TITLE);
  });

  it("hesaplanamaz hükümde HİÇBİR YÜZDE UYDURULMAZ (`%0` yazılmaz)", () => {
    const verdict = valueBalanceVerdict(
      CONTRACT,
      balance({
        our_value: "0",
        owner_value: "0",
        assigned_value_total: "0",
        our_actual_pct: null,
        owner_actual_pct: null,
        deviation_pct: null,
        is_within_tolerance: null,
      }),
    );
    expect(verdict.detail).not.toContain("%0");
    expect(verdict.detail).toMatch(/hesaplan|tanımsız/i);
  });

  it("tek bir alan bile `null` ise hüküm YOKTUR (cümle yarım kurulmaz)", () => {
    // Sunucu dördünü birlikte `None` yapar; yine de tek alana bakan bir dal
    // "gerçekleşen %—" gibi yarım bir cümle üretebilirdi.
    for (const partial of [
      { our_actual_pct: null },
      { owner_actual_pct: null },
      { deviation_pct: null },
    ] as const) {
      const verdict = valueBalanceVerdict(CONTRACT, balance(partial));
      expect(verdict.kind, JSON.stringify(partial)).toBe("uncomputable");
    }
  });
});

describe("🔴 EŞİK SUNUCUDAN GELİR — istemcide sabit YOKTUR", () => {
  it("kabul sınırı `tolerance_pct` alanından basılır", () => {
    expect(valueBalanceVerdict(CONTRACT, balance({ tolerance_pct: "2.00" })).detail).toContain(
      "%2",
    );
  });

  it("sunucu eşiği değiştirirse cümle DE değişir (kopyalanmış sabit yok)", () => {
    expect(valueBalanceVerdict(CONTRACT, balance({ tolerance_pct: "5.50" })).detail).toContain(
      "%5,5",
    );
  });
});
