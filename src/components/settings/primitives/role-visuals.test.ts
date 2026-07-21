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
});
