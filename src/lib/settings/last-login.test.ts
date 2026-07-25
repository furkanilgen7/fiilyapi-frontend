import { describe, it, expect } from "vitest";
import { formatLastLogin } from "./last-login";

const now = new Date("2026-07-19T12:00:00");

describe("formatLastLogin", () => {
  it("bugün için 'Bugün HH:mm' döner", () => {
    expect(formatLastLogin("2026-07-19T09:14:00", now)).toBe("Bugün 09:14");
  });
  it("dün için 'Dün HH:mm' döner", () => {
    expect(formatLastLogin("2026-07-18T17:30:00", now)).toBe("Dün 17:30");
  });
  it("daha eski için 'N gün önce' döner", () => {
    expect(formatLastLogin("2026-07-16T08:00:00", now)).toBe("3 gün önce");
  });
  it("null için '—' döner", () => {
    expect(formatLastLogin(null, now)).toBe("—");
  });
});
