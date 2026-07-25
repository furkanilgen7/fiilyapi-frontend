import { describe, it, expect } from "vitest";
import { roleVisual } from "./role-visuals";

describe("roleVisual", () => {
  it("patron için koyu badge + primary gradyan döner", () => {
    const v = roleVisual("patron");
    expect(v.badgeBg).toBe("var(--color-text)");
    expect(v.badgeText).toBe("var(--color-on-brand)");
    expect(v.gradFrom).toBe("var(--color-primary)");
    expect(v.gradTo).toBe("var(--color-avatar-blue-end)");
  });
  it("muhasebe için mor aile döner", () => {
    const v = roleVisual("accounting");
    expect(v.badgeBg).toBe("var(--color-accent-purple-soft)");
    expect(v.badgeText).toBe("var(--color-accent-purple)");
  });
  it("bilinmeyen rol için nötr slate fallback döner", () => {
    const v = roleVisual("__yok__");
    expect(v.badgeBg).toBe("var(--color-surface-muted)");
    expect(v.badgeText).toBe("var(--color-text-muted)");
    expect(v.gradFrom).toBe("var(--color-text-subtle)");
  });
  it("system_admin için matris başlığında koyu metin (headText) döner, badgeText beyaz kalır", () => {
    const v = roleVisual("system_admin");
    expect(v.headText).toBe("var(--color-text)");
    expect(v.badgeText).toBe("var(--color-on-brand)");
  });
  it("accounting için headText mor aile ile eşleşir", () => {
    const v = roleVisual("accounting");
    expect(v.headText).toBe("var(--color-accent-purple)");
  });
  it("bilinmeyen rol için headText nötr text-secondary fallback döner", () => {
    const v = roleVisual("unknown_xyz");
    expect(v.headText).toBe("var(--color-text-secondary)");
  });
});
