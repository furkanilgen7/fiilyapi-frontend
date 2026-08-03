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
  it("bekleyen amber kalir (degismedi)", () => {
    expect(PAYMENT_STATUS_BADGE.pending_approval.variant).toBe("warning");
  });
  // F-TH T2 fix round 1 (2026-08-03, kullanici karari, baglayici): renk
  // eslemesi teklestirildi — onaylandi=yesil, odendi=mavi (Taseron mockup
  // kaniti; eski surum bunun tersini varsayiyordu).
  it("onaylandi=yesil, odendi=mavi (teklestirilmis renk karari)", () => {
    expect(PAYMENT_STATUS_BADGE.approved.variant).toBe("success");
    expect(PAYMENT_STATUS_BADGE.paid.variant).toBe("primary");
  });
});
