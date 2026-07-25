import type { NotificationPrefItem } from "@/lib/api/models";

export interface NotifGroup {
  heading: string;
  emoji: string;
  keys: string[];
}

export interface NotifGroupWithItems {
  heading: string;
  emoji: string;
  items: NotificationPrefItem[];
}

export interface NotifEventDisplay {
  name: string;
  desc: string;
}

export const NOTIF_GROUPS: NotifGroup[] = [
  {
    heading: "Hakediş & Ödeme",
    emoji: "💰",
    keys: ["progress_payment_created", "progress_payment_approved", "vat_due_soon"],
  },
  {
    heading: "Stok & Satınalma",
    emoji: "📦",
    keys: ["stock_low", "purchase_approval_pending"],
  },
  {
    heading: "Saha & İK",
    emoji: "👷",
    keys: ["payroll_payday", "daily_log_missing"],
  },
];

// Backend etiketleri ASCII/teknik (mockup'taki Türkçe ad+açıklama ile eşleşmiyor);
// satır görünümü event_key üzerinden bu haritadan sürülür.
export const NOTIF_EVENT_DISPLAY: Record<string, NotifEventDisplay> = {
  progress_payment_created: { name: "Yeni hakediş talebi", desc: "Taşeron hakediş oluşturduğunda" },
  progress_payment_approved: { name: "Hakediş onaylandı", desc: "Onay akışı tamamlandığında" },
  vat_due_soon: { name: "KDV vade yaklaşıyor", desc: "7 gün öncesinde" },
  stock_low: { name: "Kritik stok uyarısı", desc: "Min. stok seviyesine düşüldüğünde" },
  purchase_approval_pending: { name: "Satınalma onay bekliyor", desc: "Yeni satın alma talebi geldiğinde" },
  payroll_payday: { name: "Bordro ödeme günü", desc: "Aylık bordro ödeme tarihinde" },
  daily_log_missing: { name: "Günlük kayıt girilmedi", desc: "Şantiye şefi saat 18:00'e kadar girmezse" },
};

export function groupNotifications(items: NotificationPrefItem[]): NotifGroupWithItems[] {
  const byKey = new Map(items.map((i) => [i.event_key, i]));
  return NOTIF_GROUPS.map((g) => ({
    heading: g.heading,
    emoji: g.emoji,
    items: g.keys.map((k) => byKey.get(k)).filter((i): i is NotificationPrefItem => Boolean(i)),
  }));
}
