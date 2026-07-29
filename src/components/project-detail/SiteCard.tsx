import Link from "next/link";

import { cx } from "@/lib/cx";
import { formatMonthYear, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

import "./project-detail.css";

export interface SiteCardProps {
  projectId: string;
  site: SiteListItem;
}

const STATUS_LABELS: Record<SiteListItem["status"], string> = {
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

// Rozet stili duruma gore ayri sinif tasir — on_hold'u "aktif" (yesil) grubuna
// dusurmemek icin kendi (--pending, notr) sinifi var (kod inceleme bulgusu).
const STATUS_BADGE_CLASS: Record<SiteListItem["status"], string> = {
  active: "site-card__status--active",
  on_hold: "site-card__status--pending",
  completed: "site-card__status--muted",
};

const NO_END_DATE_TITLE = "Bitiş tarihi girilmemiş";

// "Kuyubaşı Mah. · Şantiye Şefi: S. Öztürk" — ikisi de bos olabilir (spec §4.3).
function subtitle(site: SiteListItem): string {
  const parts = [
    site.address,
    site.site_manager_name ? `Şantiye Şefi: ${site.site_manager_name}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

// Yer tutucu KPI hucresi — duzeni korur, "—" basar, title'da aciklama verir (spec §7.1).
function PlaceholderValue({
  valueClassName,
  pendingModule,
}: {
  valueClassName: string;
  pendingModule: string;
}) {
  return (
    <div
      className={cx(valueClassName, "site-card__kpi-value--pending")}
      title={pendingModuleLabel(pendingModule)}
    >
      —
    </div>
  );
}

// Ucuncu hucre: aktif/beklemede -> "Kalan Gun" (gecikmede kirmizi "X gun gecikme"),
// tamamlanmis -> "Teslim" + teslim tarihi (spec §4.3, §7.5).
function ThirdCell({ site }: { site: SiteListItem }) {
  if (site.status === "completed") {
    return (
      <div className="site-card__kpi">
        <div className="site-card__kpi-value site-card__kpi-value--days site-card__kpi-value--delivered">
          Teslim
        </div>
        <div className="site-card__kpi-label">
          {site.delivery_date ? formatMonthYear(site.delivery_date) : "—"}
        </div>
      </div>
    );
  }

  if (site.remaining_days === null) {
    return (
      <div className="site-card__kpi">
        <div
          className="site-card__kpi-value site-card__kpi-value--days site-card__kpi-value--pending"
          title={NO_END_DATE_TITLE}
        >
          —
        </div>
        <div className="site-card__kpi-label">Kalan Gün</div>
      </div>
    );
  }

  const isDelayed = site.remaining_days < 0;
  return (
    <div className="site-card__kpi">
      <div
        className={cx(
          "site-card__kpi-value",
          "site-card__kpi-value--days",
          isDelayed && "site-card__kpi-value--delay",
        )}
      >
        {isDelayed ? `${Math.abs(site.remaining_days)} gün gecikme` : site.remaining_days}
      </div>
      <div className="site-card__kpi-label">Kalan Gün</div>
    </div>
  );
}

function ProgressBar({ site }: { site: SiteListItem }) {
  const { progress_pct: progress } = site;
  return (
    <div className="site-card__progress-track">
      {progress.available && progress.value !== null && progress.value !== undefined && (
        <div
          className="site-card__progress-fill"
          data-testid="site-card-progress-fill"
          style={{ width: `${Math.min(Number(progress.value), 100)}%` }}
        />
      )}
    </div>
  );
}

interface ChipDef {
  label: string;
  emoji: string;
  href: string;
  variant?: "detay";
}

// Yazilmamis rotalara giden cipler §7.3 desenini takip eder: gezinilebilir kalir,
// title ile "Bu bolum yakinda" denir. "→ Detay" hedefi bu dilimin kendi rotasi
// (Task 8'de yazilir), bu yuzden ayri title tasimaz.
function chipsFor(projectId: string, site: SiteListItem): ChipDef[] {
  const base = `/projeler/${projectId}`;
  const chips: ChipDef[] = [
    { label: "İş Kalemleri", emoji: "📋", href: `${base}/is-kalemleri` },
  ];
  if (site.status === "completed") {
    chips.push({ label: "Final Hakediş", emoji: "💰", href: `${base}/isveren-hakedis` });
  } else {
    chips.push({ label: "İşveren Hak.", emoji: "💰", href: `${base}/isveren-hakedis` });
    chips.push({ label: "Taşeron Hak.", emoji: "🏗", href: `${base}/taseron-hakedis` });
  }
  chips.push({
    label: "→ Detay",
    emoji: "",
    href: `${base}/santiyeler/${site.id}`,
    variant: "detay",
  });
  return chips;
}

export function SiteCard({ projectId, site }: SiteCardProps) {
  const isCompleted = site.status === "completed";
  const sub = subtitle(site);

  return (
    <article className={cx("site-card", isCompleted && "site-card--completed")}>
      <div className="site-card__strip" aria-hidden="true" />
      <div className="site-card__body">
        <div className="site-card__head">
          <div>
            <h3 className="site-card__name">{site.name}</h3>
            {sub && <p className="site-card__subtitle">{sub}</p>}
          </div>
          <span className={cx("site-card__status", STATUS_BADGE_CLASS[site.status])}>
            {STATUS_LABELS[site.status]}
          </span>
        </div>

        <div className="site-card__kpis">
          <div className="site-card__kpi">
            {site.worker_count.available && site.worker_count.count !== null && site.worker_count.count !== undefined ? (
              <div className="site-card__kpi-value site-card__kpi-value--worker">
                {site.worker_count.count}
              </div>
            ) : (
              <PlaceholderValue
                valueClassName="site-card__kpi-value site-card__kpi-value--worker"
                pendingModule={site.worker_count.pending_module}
              />
            )}
            <div className="site-card__kpi-label">İşçi</div>
          </div>

          <div className="site-card__kpi">
            {site.progress_pct.available && site.progress_pct.value !== null && site.progress_pct.value !== undefined ? (
              <div className="site-card__kpi-value site-card__kpi-value--progress">
                {formatPercent(site.progress_pct.value)}
              </div>
            ) : (
              <PlaceholderValue
                valueClassName="site-card__kpi-value site-card__kpi-value--progress"
                pendingModule={site.progress_pct.pending_module}
              />
            )}
            <div className="site-card__kpi-label">İlerleme</div>
          </div>

          <ThirdCell site={site} />
        </div>

        <ProgressBar site={site} />

        <div className="site-card__chips">
          {chipsFor(projectId, site).map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              title={chip.variant === "detay" ? undefined : "Bu bölüm yakında"}
              className={cx(
                "site-card__chip",
                chip.variant === "detay" && "site-card__chip--detay",
              )}
            >
              {chip.emoji ? `${chip.emoji} ${chip.label}` : chip.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
