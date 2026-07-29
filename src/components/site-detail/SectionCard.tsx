import Link from "next/link";

import { cx } from "@/lib/cx";
import { formatMonthYear } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { components } from "@/lib/api/schema";

export type SectionResponse = components["schemas"]["SectionResponse"];
type SectionStatus = SectionResponse["status"];

export interface SectionCardProps {
  projectId: string;
  siteId: string;
  section: SectionResponse;
}

// Durum etiketleri mockup'tan birebir (spec §5.4).
const STATUS_LABELS: Record<SectionStatus, string> = {
  completed: "Tamamlandı",
  active: "Aktif — Devam Ediyor",
  planned: "Planlandı",
};

// Task 5'in STATUS_BADGE_CLASS deseni: durum -> sinif, satir ici ternary yok.
const STATUS_BADGE_CLASS: Record<SectionStatus, string> = {
  completed: "section-card__status--completed",
  active: "section-card__status--active",
  planned: "section-card__status--planned",
};

const STATUS_STRIP_CLASS: Record<SectionStatus, string> = {
  completed: "section-card__strip--completed",
  active: "section-card__strip--active",
  planned: "section-card__strip--planned",
};

const STATUS_CARD_CLASS: Record<SectionStatus, string> = {
  completed: "section-card--completed",
  active: "section-card--active",
  planned: "section-card--planned",
};

// Yer tutucu metrik hucresi — duzeni korur, "—" basar, title'da aciklama verir
// (spec §7.1, SiteHeroBar/SiteCard'daki PlaceholderValue deseniyle ayni).
function PlaceholderValue({ valueClassName, pendingModule }: { valueClassName: string; pendingModule: string }) {
  return (
    <div className={cx(valueClassName, "section-card__metric-value--pending")} title={pendingModuleLabel(pendingModule)}>
      —
    </div>
  );
}

// "Nis 2025 – Tem 2025 · Sorumlu: M. Arslan" — tek ay araligiysa tek kez basilir,
// sorumlu yoksa "Atanmadı" (mockup Bölüm 5 deseni).
function sectionMeta(section: SectionResponse): string {
  const parts: string[] = [];
  const start = section.start_date ? formatMonthYear(section.start_date) : null;
  const end = section.end_date ? formatMonthYear(section.end_date) : null;
  if (start && end) {
    parts.push(start === end ? start : `${start} – ${end}`);
  } else if (start ?? end) {
    parts.push((start ?? end) as string);
  }
  parts.push(section.manager_name ? `Sorumlu: ${section.manager_name}` : "Atanmadı");
  return parts.join(" · ");
}

interface MetricCellProps {
  label: string;
  valueClassName?: string;
  placeholder: { available: boolean; pending_module: string };
  children: React.ReactNode;
}

function MetricCell({ label, valueClassName = "section-card__metric-value", placeholder, children }: MetricCellProps) {
  return (
    <div className="section-card__metric">
      <div className="section-card__metric-label">{label}</div>
      {placeholder.available ? (
        <div className={valueClassName}>{children}</div>
      ) : (
        <PlaceholderValue valueClassName={valueClassName} pendingModule={placeholder.pending_module} />
      )}
    </div>
  );
}

// Bölüm kartı (spec §5.4, mockup Şantiye Detay.dc.html satır 153+). Dört metrik
// (İlerleme · İş Kalemleri · Bölüm Bedeli · İşçi) bu dilimde HEPSI yer tutucudur —
// backend henuz gercek deger uretmiyor. "3 gecikme riski" satiri KASITLI olarak
// basilmaz (spec §7.2) — backend bu alani hic dondurmuyor.
export function SectionCard({ projectId, siteId, section }: SectionCardProps) {
  const isPlanned = section.status === "planned";
  const detayHref = `/projeler/${projectId}/santiyeler/${siteId}/bolumler/${section.id}`;

  return (
    <div className={cx("section-card", STATUS_CARD_CLASS[section.status])}>
      <div className={cx("section-card__strip", STATUS_STRIP_CLASS[section.status])} aria-hidden="true" />
      <div className="section-card__body">
        <div>
          <div className="section-card__name-row">
            <span className={cx("section-card__name", isPlanned && "section-card__name--muted")}>
              {section.name}
            </span>
            <span className={cx("section-card__status", STATUS_BADGE_CLASS[section.status])}>
              {STATUS_LABELS[section.status]}
            </span>
          </div>
          <div className="section-card__meta">{sectionMeta(section)}</div>
        </div>

        <MetricCell
          label="İlerleme"
          valueClassName="section-card__metric-value section-card__metric-value--progress"
          placeholder={section.progress_pct}
        >
          {section.progress_pct.available && section.progress_pct.value != null ? `%${section.progress_pct.value}` : null}
        </MetricCell>

        <MetricCell label="İş Kalemleri" placeholder={section.boq_item_count}>
          {section.boq_item_count.count}
        </MetricCell>

        <MetricCell
          label="Bölüm Bedeli"
          valueClassName="section-card__metric-value section-card__metric-value--money"
          placeholder={section.budget}
        >
          {section.budget.value}
        </MetricCell>

        <MetricCell label="İşçi" placeholder={section.worker_count}>
          {section.worker_count.count}
        </MetricCell>

        <div className="section-card__action">
          {isPlanned ? (
            <button type="button" className="section-card__action-btn section-card__action-btn--edit">
              Düzenle
            </button>
          ) : (
            <Link
              href={detayHref}
              title="Bu bölüm yakında"
              className={cx(
                "section-card__action-btn",
                section.status === "active"
                  ? "section-card__action-btn--solid"
                  : "section-card__action-btn--ghost",
              )}
            >
              Detay →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
