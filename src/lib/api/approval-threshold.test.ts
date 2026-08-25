import { describe, expect, it } from "vitest";

import {
  APPROVAL_THRESHOLD_DECIMALS_REASON,
  APPROVAL_THRESHOLD_EMPTY_REASON,
  APPROVAL_THRESHOLD_INVALID_REASON,
  APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS,
  APPROVAL_THRESHOLD_NEGATIVE_REASON,
  APPROVAL_THRESHOLD_TOO_LARGE_REASON,
  checkApprovalThreshold,
} from "./approval-threshold";

/**
 * KONTROL SORUSU (görev emri): "bu kapı, gerçek backend'in REDDEDECEĞİ bir
 * isteği reddediyor mu?" — sözleşme
 * `backend/app/modules/approvals/schemas.py:39`de ölçüldü:
 * `Field(ge=0, max_digits=18, decimal_places=2)`.
 *
 * Her sınır AÇIKÇA sınanır (MU-2 kanonu: "sınır değeri kullanılmayan pencere
 * bekçisizdir") — kabul edilen `N` ve reddedilen `N+1` yan yana yazılır.
 */
describe("checkApprovalThreshold — sözleşme sınırları", () => {
  it("olağan eşiği kabul eder ve ondalık string döner", () => {
    expect(checkApprovalThreshold("500000")).toEqual({ ok: true, value: "500000" });
  });

  it("TR virgülünü noktaya çevirir (tek ayrıştırıcı kanonu)", () => {
    expect(checkApprovalThreshold("1500,50")).toEqual({ ok: true, value: "1500.50" });
  });

  it("sıfır GEÇERLİDİR — `ge=0`, `gt=0` DEĞİL", () => {
    expect(checkApprovalThreshold("0")).toEqual({ ok: true, value: "0" });
  });

  it("negatif eşiği reddeder (`ge=0`; openapi string dalı işareti YAKALAMAZ)", () => {
    expect(checkApprovalThreshold("-1")).toEqual({
      ok: false,
      reason: APPROVAL_THRESHOLD_NEGATIVE_REASON,
    });
  });

  it("2 ondalık KABUL, 3 ondalık RED (`decimal_places=2` sınırı)", () => {
    expect(checkApprovalThreshold("12.34")).toEqual({ ok: true, value: "12.34" });
    expect(checkApprovalThreshold("12.345")).toEqual({
      ok: false,
      reason: APPROVAL_THRESHOLD_DECIMALS_REASON,
    });
  });

  it("16 haneli tam sayı KABUL, 17 hane RED (`max_digits=18 − 2`)", () => {
    const kabul = "9".repeat(APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS);
    const red = "9".repeat(APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS + 1);
    expect(APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS).toBe(16);
    expect(checkApprovalThreshold(kabul)).toEqual({ ok: true, value: kabul });
    expect(checkApprovalThreshold(red)).toEqual({
      ok: false,
      reason: APPROVAL_THRESHOLD_TOO_LARGE_REASON,
    });
  });

  it("baştaki sıfırlar hane sayılmaz — `Decimal` onları atar", () => {
    const value = `${"0".repeat(8)}${"9".repeat(APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS)}`;
    expect(checkApprovalThreshold(value).ok).toBe(true);
  });

  it("boş/boşluk girdi reddedilir (alan ZORUNLU)", () => {
    expect(checkApprovalThreshold("")).toEqual({
      ok: false,
      reason: APPROVAL_THRESHOLD_EMPTY_REASON,
    });
    expect(checkApprovalThreshold("   ")).toEqual({
      ok: false,
      reason: APPROVAL_THRESHOLD_EMPTY_REASON,
    });
  });

  it("rakam içermeyen girdiyi reddeder — `.` ve `+` tek başına sayı DEĞİLDİR", () => {
    for (const raw of ["abc", "1e5", ".", "+", "₺500.000"]) {
      expect(checkApprovalThreshold(raw), raw).toEqual({
        ok: false,
        reason: APPROVAL_THRESHOLD_INVALID_REASON,
      });
    }
  });

  it("`Number()`a HİÇ uğramaz — 16 haneli değer kuruşuna kadar korunur", () => {
    const büyük = "9999999999999999.99";
    const sonuç = checkApprovalThreshold(büyük);
    expect(sonuç).toEqual({ ok: true, value: büyük });
    // Float yolu seçilseydi bu iddia patlardı (`Number("9999999999999999.99")`
    // → 10000000000000000).
    expect(String(Number(büyük))).not.toBe(büyük);
  });
});
