import { describe, it, expect } from "vitest";

import { DOCUMENT_EXPIRING_SOON_DAYS, documentValidity } from "./document-validity";

const AS_OF = "2026-08-20";

describe("documentValidity", () => {
  it("valid_until null ⇒ 'Süresiz' (uyarı DEĞİL, nötr olgu)", () => {
    const result = documentValidity(null, AS_OF);
    expect(result).toMatchObject({ kind: "perpetual", label: "Süresiz", variant: "neutral" });
  });

  it("SINIR: bugünün kendisi hâlâ 'yaklaşıyor'dur, 'doldu' değil (sunucu eşiği DÂHİL)", () => {
    const result = documentValidity(AS_OF, AS_OF);
    expect(result.kind).toBe("expiring");
    expect(result.label).toBe("0 gün kaldı");
  });

  it("SINIR: dün ⇒ 'Süresi doldu'", () => {
    const result = documentValidity("2026-08-19", AS_OF);
    expect(result).toMatchObject({ kind: "expired", variant: "danger", days: 1 });
  });

  it(`SINIR: +${DOCUMENT_EXPIRING_SOON_DAYS} gün DÂHİL uyarı, +${DOCUMENT_EXPIRING_SOON_DAYS + 1} gün 'Geçerli'`, () => {
    expect(documentValidity("2026-09-19", AS_OF).kind).toBe("expiring");
    expect(documentValidity("2026-09-20", AS_OF).kind).toBe("valid");
  });

  it("ay/yıl sınırını UTC gün sayısıyla geçer (yerel saat/DST kaydırmaz)", () => {
    // 2026-12-31 → 2027-01-05 = 5 gün. Yerel `new Date` ayrıştırması kullanılsaydı
    // saat dilimine göre 4 ya da 5 çıkabilirdi.
    expect(documentValidity("2027-01-05", "2026-12-31").days).toBe(5);
  });

  it("ayrıştırılamayan tarihte UYDURMA 'Geçerli' basmaz (fail-closed)", () => {
    expect(documentValidity("31.12.2026", AS_OF).label).toBe("—");
    expect(documentValidity("2026-09-01", "bozuk").label).toBe("—");
  });
});
