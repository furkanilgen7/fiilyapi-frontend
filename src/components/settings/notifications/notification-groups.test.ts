import { describe, it, expect } from "vitest";
import { NOTIF_GROUPS, NOTIF_EVENT_DISPLAY, groupNotifications } from "./notification-groups";
import type { NotificationPrefItem } from "@/lib/api/models";

describe("NOTIF_GROUPS", () => {
  it("3 kategori tanımlar", () => {
    expect(NOTIF_GROUPS.map((g) => g.heading)).toEqual(["Hakediş & Ödeme", "Stok & Satınalma", "Saha & İK"]);
  });
});

describe("groupNotifications", () => {
  it("olayları kategoriye dağıtır, bilinmeyeni atar", () => {
    const items: NotificationPrefItem[] = [
      { event_key: "vat_due_soon", label: "KDV", email: true, in_app: true, sms: false },
      { event_key: "stock_low", label: "Stok", email: false, in_app: true, sms: false },
      { event_key: "user_added", label: "Ekstra", email: false, in_app: true, sms: false },
    ];
    const grouped = groupNotifications(items);
    expect(grouped[0].items.map((i) => i.event_key)).toContain("vat_due_soon");
    expect(grouped[1].items.map((i) => i.event_key)).toContain("stock_low");
    expect(grouped.flatMap((g) => g.items).map((i) => i.event_key)).not.toContain("user_added");
  });
});

describe("NOTIF_EVENT_DISPLAY", () => {
  it("7 olay anahtarının tümü için ad+açıklama tanımlar", () => {
    const keys = NOTIF_GROUPS.flatMap((g) => g.keys);
    expect(keys).toHaveLength(7);
    for (const key of keys) {
      expect(NOTIF_EVENT_DISPLAY[key]).toBeDefined();
      expect(NOTIF_EVENT_DISPLAY[key].name.length).toBeGreaterThan(0);
      expect(NOTIF_EVENT_DISPLAY[key].desc.length).toBeGreaterThan(0);
    }
  });
});
