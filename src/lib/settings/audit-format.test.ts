import { describe, expect, it } from "vitest";
import {
  AUDIT_ACTION_LABEL,
  auditActorName,
  auditActorRole,
  auditIpText,
  formatAuditTime,
  isAuditAction,
} from "./audit-format";

describe("formatAuditTime", () => {
  it("mockup biçimini üretir (gg.AA SS:dd) ve UTC'yi TR saatine çevirir", () => {
    expect(formatAuditTime("2026-07-17T06:14:00Z")).toBe("17.07 09:14");
  });

  it("gün sınırını TR saatine göre atlar (UTC 21:30 → ertesi gün 00:30)", () => {
    expect(formatAuditTime("2026-07-17T21:30:00Z")).toBe("18.07 00:30");
  });

  it("ofsetli zaman damgasını da TR saatine çevirir", () => {
    expect(formatAuditTime("2026-07-17T09:14:00+03:00")).toBe("17.07 09:14");
  });

  it("ofsetsiz zaman damgasını UTC kabul eder (backend UTC saklar)", () => {
    expect(formatAuditTime("2026-07-17T06:14:00")).toBe("17.07 09:14");
  });

  it("tek haneli gün, ay ve saatleri sıfırla doldurur", () => {
    expect(formatAuditTime("2026-03-05T05:07:00Z")).toBe("05.03 08:07");
  });

  it("geçersiz zaman damgasında tire döner", () => {
    expect(formatAuditTime("gecersiz")).toBe("—");
  });
});

describe("aktör sunumu", () => {
  const actor = { id: "u1", full_name: "Ahmet Yılmaz", role_name: "Patron" };

  it("aktör varsa ad ve rol adını gösterir", () => {
    expect(auditActorName(actor)).toBe("Ahmet Yılmaz");
    expect(auditActorRole(actor)).toBe("Patron");
  });

  it("aktör null ise Sistem / Otomatik gösterir", () => {
    expect(auditActorName(null)).toBe("Sistem");
    expect(auditActorRole(null)).toBe("Otomatik");
  });
});

describe("auditIpText", () => {
  it("IP varsa aynen döner", () => {
    expect(auditIpText("192.168.1.100")).toBe("192.168.1.100");
  });

  it("IP null ise tire döner", () => {
    expect(auditIpText(null)).toBe("—");
  });
});

describe("AUDIT_ACTION_LABEL", () => {
  it("backend enum'unun altı değerini de mockup rozet metinlerine eşler", () => {
    expect(AUDIT_ACTION_LABEL).toEqual({
      login: "Giriş",
      create: "Oluşturma",
      update: "Güncelleme",
      delete: "Silme",
      approve: "Onay",
      backup: "Yedekleme",
    });
  });
});

describe("isAuditAction", () => {
  it("backend enum değerlerini tanır", () => {
    expect(isAuditAction("delete")).toBe(true);
    expect(isAuditAction("backup")).toBe(true);
  });

  it("enum dışı değerleri reddeder", () => {
    expect(isAuditAction("all")).toBe(false);
    expect(isAuditAction("toString")).toBe(false);
  });
});
