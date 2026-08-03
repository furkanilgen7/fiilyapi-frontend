import { describe, expect, it } from "vitest";

import { PAYMENT_STATUS_BADGE } from "./status";

describe("PAYMENT_STATUS_BADGE", () => {
  it("4 durumun hepsini tasir", () => {
    expect(Object.keys(PAYMENT_STATUS_BADGE).sort()).toEqual(
      ["approved", "draft", "paid", "pending_approval"].sort(),
    );
  });
  it("metinler brief tablosuyla birebir", () => {
    expect(PAYMENT_STATUS_BADGE.draft.label).toBe("Taslak");
    expect(PAYMENT_STATUS_BADGE.pending_approval.label).toBe("Onay Bekliyor");
    expect(PAYMENT_STATUS_BADGE.approved.label).toBe("Onaylandı");
    expect(PAYMENT_STATUS_BADGE.paid.label).toBe("Ödendi");
  });
  it("mockup renkleriyle eslesenler: bekleyen amber, odenen yesil", () => {
    expect(PAYMENT_STATUS_BADGE.pending_approval.variant).toBe("warning");
    expect(PAYMENT_STATUS_BADGE.paid.variant).toBe("success");
  });
});
