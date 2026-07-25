import { describe, expect, it } from "vitest";
import {
  auditDateFrom,
  buildAuditFilterQuery,
  buildAuditQuery,
  DEFAULT_AUDIT_FILTERS,
  toSearchParams,
  trToday,
} from "./audit-query";

// UTC 17 Temmuz 2026 06:14 → Europe/Istanbul 17 Temmuz 09:14.
const NOW = new Date("2026-07-17T06:14:00Z");
// UTC 16 Temmuz 22:30 → TR 17 Temmuz 01:30: TR günü UTC gününden ileridedir.
const NOW_BEFORE_TR_MIDNIGHT_ROLLOVER = new Date("2026-07-16T22:30:00Z");

describe("trToday", () => {
  it("TR takvim gününü döner (UTC günü farklı olsa bile)", () => {
    expect(trToday(NOW_BEFORE_TR_MIDNIGHT_ROLLOVER)).toBe("2026-07-17");
  });
});

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

  it("presetleri tarayıcının yerel gününe değil TR gününe göre hesaplar", () => {
    expect(auditDateFrom("last7", NOW_BEFORE_TR_MIDNIGHT_ROLLOVER)).toBe("2026-07-11");
    expect(auditDateFrom("thisMonth", NOW_BEFORE_TR_MIDNIGHT_ROLLOVER)).toBe("2026-07-01");
  });
});

describe("buildAuditQuery", () => {
  it("varsayılan filtrelerde yalnızca date_from + sayfalama gönderir", () => {
    expect(buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 0 }, NOW)).toEqual({
      date_from: "2026-07-11",
      limit: 50,
      offset: 0,
    });
  });

  it("date_to göndermez (preset'ler 'şu ana kadar' anlamındadır)", () => {
    const query = buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 0 }, NOW);
    expect(query).not.toHaveProperty("date_to");
  });

  it("kullanıcı, işlem ve arama filtrelerini query parametrelerine eşler", () => {
    const query = buildAuditQuery(
      { actorUserId: "u-1", action: "delete", datePreset: "thisMonth", search: "hakediş" },
      { limit: 50, offset: 100 },
      NOW,
    );
    expect(query).toEqual({
      date_from: "2026-07-01",
      actor_user_id: "u-1",
      action: "delete",
      q: "hakediş",
      limit: 50,
      offset: 100,
    });
  });

  it("sayfalama offset'ini yansıtır", () => {
    expect(buildAuditQuery(DEFAULT_AUDIT_FILTERS, { limit: 50, offset: 50 }, NOW).offset).toBe(50);
  });
});

describe("buildAuditFilterQuery", () => {
  it("export için limit/offset göndermez", () => {
    const query = buildAuditFilterQuery(
      { actorUserId: "u-9", action: "login", datePreset: "last7", search: "" },
      NOW,
    );
    expect(query).toEqual({ date_from: "2026-07-11", actor_user_id: "u-9", action: "login" });
  });

  it("boş/whitespace aramayı filtre saymaz", () => {
    const query = buildAuditFilterQuery({ ...DEFAULT_AUDIT_FILTERS, search: "   " }, NOW);
    expect(query).not.toHaveProperty("q");
  });

  it("arama metnindeki baş/son boşlukları kırpar", () => {
    const query = buildAuditFilterQuery({ ...DEFAULT_AUDIT_FILTERS, search: "  ahmet " }, NOW);
    expect(query.q).toBe("ahmet");
  });
});

describe("toSearchParams", () => {
  it("sayısal değerleri stringe çevirir ve boş değerleri atar", () => {
    expect(
      toSearchParams({ date_from: "2026-07-11", actor_user_id: null, limit: 50, offset: 0 }),
    ).toEqual({ date_from: "2026-07-11", limit: "50", offset: "0" });
  });
});
