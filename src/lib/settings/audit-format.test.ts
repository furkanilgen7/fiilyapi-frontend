import { describe, expect, it } from "vitest";
import { AUDIT_ACTION_LABEL, auditActorName, auditActorRole, auditIpText, formatAuditTime } from "./audit-format";

describe("formatAuditTime", () => {
  it("mockup biçimini üretir (gg.AA SS:dd)", () => {
    expect(formatAuditTime("2026-07-17T09:14:00")).toBe("17.07 09:14");
  });

  it("tek haneli gün, ay ve saatleri sıfırla doldurur", () => {
    expect(formatAuditTime("2026-03-05T08:07:00")).toBe("05.03 08:07");
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
