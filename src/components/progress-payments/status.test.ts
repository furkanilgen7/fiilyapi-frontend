import { describe, expect, it } from "vitest";

import { PROGRESS_PAYMENT_STATUS_BADGE } from "./status";

describe("PROGRESS_PAYMENT_STATUS_BADGE", () => {
  it("4 durumun hepsini tasir", () => {
    expect(Object.keys(PROGRESS_PAYMENT_STATUS_BADGE).sort()).toEqual(
      ["approved", "draft", "paid", "pending_approval"].sort(),
    );
  });
  it("metinler brief tablosuyla birebir", () => {
    expect(PROGRESS_PAYMENT_STATUS_BADGE.draft.label).toBe("Taslak");
    expect(PROGRESS_PAYMENT_STATUS_BADGE.pending_approval.label).toBe("Onay Bekliyor");
    expect(PROGRESS_PAYMENT_STATUS_BADGE.approved.label).toBe("Onaylandı");
    expect(PROGRESS_PAYMENT_STATUS_BADGE.paid.label).toBe("Ödendi");
  });
  it("mockup renkleriyle eslesenler: bekleyen amber, odenen yesil", () => {
    expect(PROGRESS_PAYMENT_STATUS_BADGE.pending_approval.variant).toBe("warning");
    expect(PROGRESS_PAYMENT_STATUS_BADGE.paid.variant).toBe("success");
  });
});
