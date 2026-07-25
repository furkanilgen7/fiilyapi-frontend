import { describe, expect, it } from "vitest";
import { auditDateFrom, buildAuditFilterQuery, buildAuditQuery, DEFAULT_AUDIT_FILTERS } from "./audit-query";

// Yerel saatte 17 Temmuz 2026, Cuma.
const NOW = new Date(2026, 6, 17, 9, 14);

describe("auditDateFrom", () => {
  it("son 7 gün presetini bugünü kapsayacak şekilde 6 gün geriye çevirir", () => {
    expect(auditDateFrom("last7", NOW)).toBe("2026-07-11");
  });

  it("son 30 gün presetini 29 gün geriye çevirir ve ay sınırını aşar", () => {
    expect(auditDateFrom("last30", NOW)).toBe("2026-06-18");
  });

  it("bu ay presetini ayın ilk gününe çevirir", () => {
    expect(auditDateFrom("thisMonth", NOW)).toBe("2026-07-01");
  });
});

describe("buildAuditQuery", () => {
  it("varsayılan filtrelerde yalnızca date_from + sayfalama gönderir", () => {
    expect(buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 0 }, NOW)).toEqual({
      date_from: "2026-07-11",
      limit: "50",
      offset: "0",
    });
  });

  it("date_to göndermez (preset'ler 'şu ana kadar' anlamındadır)", () => {
    const query = buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 0 }, NOW);
    expect(query).not.toHaveProperty("date_to");
  });

  it("kullanıcı ve işlem filtrelerini query parametrelerine eşler", () => {
    const query = buildAuditQuery(
      { actorUserId: "u-1", action: "delete", datePreset: "thisMonth" },
      { limit: 50, offset: 100 },
      NOW,
    );
    expect(query).toEqual({
      date_from: "2026-07-01",
      actor_user_id: "u-1",
      action: "delete",
      limit: "50",
      offset: "100",
    });
  });

  it("sayfalama offset'ini yansıtır", () => {
    expect(buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 50 }, NOW).offset).toBe("50");
  });
});

describe("buildAuditFilterQuery", () => {
  it("export için limit/offset göndermez", () => {
    const query = buildAuditFilterQuery({ actorUserId: "u-9", action: "login", datePreset: "last7" }, NOW);
    expect(query).toEqual({ date_from: "2026-07-11", actor_user_id: "u-9", action: "login" });
  });
});
