import { Button } from "@/components/ui";
import { CheckIcon, inlineSymbolProps } from "@/components/ui/icons";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { cx } from "@/lib/cx";
import "./integrations-screen.css";

type Status = "connected" | "unconfigured" | "off";

type IntegrationCard = {
  emoji: string;
  iconTint: "success" | "brand" | "amber" | "purple";
  name: string;
  sub: string;
  desc: string;
  status: Status;
  action: string;
  primary: boolean;
};

// Sabit ornek veri; backend entegrasyonu yok (informational-only).
const CARDS: IntegrationCard[] = [
  {
    emoji: "🏛️",
    iconTint: "success",
    name: "GİB e-Fatura",
    sub: "Gelir İdaresi Başkanlığı",
    desc: "Otomatik e-fatura gönderimi ve e-arşiv entegrasyonu",
    status: "connected",
    action: "Ayarlar",
    primary: false,
  },
  {
    emoji: "📄",
    iconTint: "brand",
    name: "Logo e-Fatura",
    sub: "Logo Yazılım",
    desc: "Logo Tiger / Wings muhasebe entegrasyonu",
    status: "connected",
    action: "Ayarlar",
    primary: false,
  },
  {
    emoji: "🏦",
    iconTint: "amber",
    name: "Ziraat Bankası API",
    sub: "Banka ekstresi otomatik çekme",
    desc: "Günlük ekstre ve mutabakat otomasyonu",
    status: "connected",
    action: "Ayarlar",
    primary: false,
  },
  {
    emoji: "🏥",
    iconTint: "purple",
    name: "SGK e-Bildirge",
    sub: "Sosyal Güvenlik Kurumu",
    desc: "Aylık SGK bildirgesi otomatik hazırlama",
    status: "unconfigured",
    action: "Bağla",
    primary: true,
  },
  {
    emoji: "📱",
    iconTint: "success",
    name: "WhatsApp Business",
    sub: "Bildirim ve onay mesajları",
    desc: "Hakediş ve onay bildirimlerini WhatsApp ile gönder",
    status: "off",
    action: "Bağla",
    primary: true,
  },
  {
    emoji: "☁️",
    iconTint: "brand",
    name: "Bulut Depolama",
    sub: "OneDrive / Google Drive",
    desc: "Belge arşivini otomatik buluta yedekle",
    status: "off",
    action: "Bağla",
    primary: true,
  },
];

const STATUS_LABEL: Record<Status, string> = {
  connected: "Bağlı",
  unconfigured: "Yapılandırılmadı",
  off: "Bağlı Değil",
};

/**
 * Mockup'ta yalnız "Bağlı" rozeti sonuna `✓` alır. Sembol ETİKETE GÖMÜLMEZ
 * (F-SEM): `✓` (U+2713) self-host alt-kümelerde yoktur, glif olarak basılınca
 * kare oynar. Etiket metni yukarıda, ikon kararı burada.
 */
const STATUS_HAS_CHECK: Record<Status, boolean> = {
  connected: true,
  unconfigured: false,
  off: false,
};

export function IntegrationsScreen() {
  return (
    <>
      <p className="settings-note">
        Bu bölüm henüz canlı entegrasyonlara bağlı değildir; kartlar bilgilendirme amaçlıdır.
      </p>
      <div className="integrations-grid" style={{ marginTop: 16 }}>
        {CARDS.map((c) => (
          <SettingsCard key={c.name} bodyPad="tight">
            <div className="integration-card__head">
              <span
                className={cx("integration-card__icon", `integration-card__icon--${c.iconTint}`)}
                aria-hidden="true"
              >
                {c.emoji}
              </span>
              <div>
                <div className="integration-card__name">{c.name}</div>
                <div className="integration-card__sub">{c.sub}</div>
              </div>
            </div>
            <p className="integration-card__desc">{c.desc}</p>
            <div className="integration-card__footer">
              <span className={cx("integration-badge", `integration-badge--${c.status}`)}>
                {STATUS_LABEL[c.status]}
                {STATUS_HAS_CHECK[c.status] && (
                  <>
                    {" "}
                    <CheckIcon {...inlineSymbolProps} />
                  </>
                )}
              </span>
              <Button variant={c.primary ? "primary" : "secondary"} size="sm" disabled>
                {c.action}
              </Button>
            </div>
          </SettingsCard>
        ))}
      </div>
    </>
  );
}
