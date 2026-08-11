import Link from "next/link";

import { cx } from "@/lib/cx";
import { formatCompactCurrency, formatMonthYear, formatPercent } from "@/lib/format";
import { pendingModuleLabel, type PendingModuleKey } from "@/lib/pending-modules";
import { SECTION_STATUS_CLASS_SUFFIX, SECTION_STATUS_LABELS } from "@/lib/section-labels";
import type { components } from "@/lib/api/schema";

export type SectionResponse = components["schemas"]["SectionResponse"];
type SectionStatus = SectionResponse["status"];
type CountPlaceholder = components["schemas"]["CountPlaceholder"];
type MetricPlaceholder = components["schemas"]["app__modules__projects__schemas__MetricPlaceholder"];

// Yer tutucu "gercek deger tasiyor mu?" — `available` TEK BASINA yetmez:
// available: true + deger null gelirse hucre bos kalirdi (kod inceleme
// bulgusu). SiteCard/SiteHeroBar ile ayni kural: bayrak VE deger.
function hasRealValue(placeholder: AnyPlaceholder): boolean {
  const raw = placeholder.count ?? placeholder.value;
  return placeholder.available && raw !== null && raw !== undefined;
}

// Iki yer tutucu seklinin ortak okuma yuzeyi: sayaclar `count`, tutar/yuzde
// `value` tasir.
type AnyPlaceholder = {
  available: boolean;
  count?: number | null;
  value?: string | null;
  pending_module?: PendingModuleKey;
};

export interface SectionCardProps {
  projectId: string;
  siteId: string;
  section: SectionResponse;
}

// Durum etiketleri mockup'tan birebir (spec §5.4). `on_hold` F-P6 T2'de
// GERÇEK tasarımını aldı — metni `section-labels.ts`teki tek kaynaktan gelir
// (Bölüm Detay hero rozetiyle PAYLAŞILIR, artık `planned` kopyası DEĞİL).
// Diğer üç durumun kart-özel (daha uzun) metni burada kalır — o metinler
// yalnız bu listede kullanılır, T2 hero'da kısa biçim basılır.
const STATUS_LABELS: Record<SectionStatus, string> = {
  completed: "Tamamlandı",
  active: "Aktif — Devam Ediyor",
  planned: "Planlandı",
  on_hold: SECTION_STATUS_LABELS.on_hold,
};

// Durum -> sınıf eki TEK KAYNAKTAN gelir (`SECTION_STATUS_CLASS_SUFFIX`,
// SectionDetailView ile PAYLAŞILIR). Dört ayrı Record'a "on_hold: planned"
// kopyalamak yerine tek haritadan türetilir (kod inceleme bulgusu düzeltmesi,
// F-P6 T2).
function statusClass(prefix: string, status: SectionStatus): string {
  return `${prefix}--${SECTION_STATUS_CLASS_SUFFIX[status]}`;
}

// Metrik etiketleri duruma gore degisir — mockup KAZANIR (spec §5.4 sabit
// dortluyu yaziyordu, mockup ise satir bazinda farkli etiket basiyor):
//   tamamlandi (satir 178, 215) "Bölüm Bedeli" · (182, 219) "İşçi (zirve)"
//   aktif      (satir 252)      "Bölüm Bedeli" · (256)      "Aktif İşçi"
//   planlandi  (satir 288, 324) "Tahmini Bedel" · (292, 328) "Planlanan İşçi"
// "İlerleme" (168/205/242/279/315) ve "İş Kalemleri" (173/210/247/284/320)
// her durumda AYNI kalir — bu yuzden sabit metin olarak basilir.
const STATUS_BUDGET_LABEL: Record<SectionStatus, string> = {
  completed: "Bölüm Bedeli",
  active: "Bölüm Bedeli",
  planned: "Tahmini Bedel",
  on_hold: "Tahmini Bedel",
};

const STATUS_WORKER_LABEL: Record<SectionStatus, string> = {
  completed: "İşçi (zirve)",
  active: "Aktif İşçi",
  planned: "Planlanan İşçi",
  on_hold: "Planlanan İşçi",
};

// Yer tutucu metrik hucresi — duzeni korur, "—" basar, title'da aciklama verir
// (spec §7.1, SiteHeroBar/SiteCard'daki PlaceholderValue deseniyle ayni).
function PlaceholderValue({ valueClassName, pendingModule }: { valueClassName: string; pendingModule: PendingModuleKey }) {
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
  placeholder: CountPlaceholder | MetricPlaceholder;
  children: React.ReactNode;
}

function MetricCell({ label, valueClassName = "section-card__metric-value", placeholder, children }: MetricCellProps) {
  return (
    <div className="section-card__metric">
      <div className="section-card__metric-label">{label}</div>
      {hasRealValue(placeholder) ? (
        <div className={valueClassName}>{children}</div>
      ) : (
        <PlaceholderValue valueClassName={valueClassName} pendingModule={placeholder.pending_module} />
      )}
    </div>
  );
}

// "İlerleme" hucresi mockup'ta her durumda mini bir cubuk cizer (satir 170,
// 207, 244, 281, 317). Yer tutucuyken sahte %0 izlenimi vermemek icin dolgu
// basilmaz, yalniz bos iz birakilir (spec §7.1, SiteHeroBar/SiteCard ile ayni
// desen). Gercek deger geldiginde renk semasi duruma gore degisir (kod
// inceleme bulgusu — ilk surumde her zaman "aktif/mavi" semasi sabitti):
// tamamlandi=yesil, aktif=mavi, planlandi=notr gri (mockup satir 169-170,
// 206-207, 243-244, 280-281, 316-317). Yer tutucuyken durum rengi
// uygulanmaz — bilinmeyen bir degere yanlislikla yesil/mavi boyamamak icin.
function ProgressMetricCell({
  progress,
  status,
}: {
  progress: SectionResponse["progress_pct"];
  status: SectionStatus;
}) {
  const isReal = hasRealValue(progress);
  const progressClass = isReal ? statusClass("section-card__metric-progress", status) : undefined;
  return (
    <div className="section-card__metric">
      <div className="section-card__metric-label">İlerleme</div>
      {isReal ? (
        <div
          className={cx(
            "section-card__metric-value",
            "section-card__metric-value--progress",
            progressClass,
          )}
        >
          {formatPercent(progress.value ?? 0)}
        </div>
      ) : (
        <PlaceholderValue
          valueClassName="section-card__metric-value section-card__metric-value--progress"
          pendingModule={progress.pending_module}
        />
      )}
      <div
        className={cx("section-card__metric-track", progressClass)}
        data-testid="section-card-progress-track"
      >
        {isReal && (
          <div
            className={cx("section-card__metric-track-fill", progressClass)}
            data-testid="section-card-progress-fill"
            style={{ width: `${Math.min(Number(progress.value), 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}

// Bölüm kartı (spec §5.4, mockup Şantiye Detay.dc.html satır 153+). Dört metrik
// (İlerleme · İş Kalemleri · bedel · işçi — son ikisinin etiketi duruma gore
// degisir, bkz. STATUS_BUDGET_LABEL/STATUS_WORKER_LABEL) bu dilimde HEPSI yer tutucudur —
// backend henuz gercek deger uretmiyor. "3 gecikme riski" satiri KASITLI olarak
// basilmaz (spec §7.2) — backend bu alani hic dondurmuyor.
//
// F-P6 T2: Bölüm Detay ekranı artık GERÇEK olduğu için kart her durumda ORAYA
// linklenir (task-2-brief.md "SectionCard güncellemesi") — önceki "planned ->
// devre dışı Düzenle" placeholder'ı kaldırıldı (T3 ayrı bir düzenleme rotası
// açacak, kart eylemi yalnız DETAYA gider).
export function SectionCard({ projectId, siteId, section }: SectionCardProps) {
  const isPlanned = section.status === "planned";
  const detayHref = `/projeler/${projectId}/santiyeler/${siteId}/bolumler/${section.id}`;

  return (
    <div className={cx("section-card", statusClass("section-card", section.status))}>
      <div
        className={cx("section-card__strip", statusClass("section-card__strip", section.status))}
        aria-hidden="true"
      />
      <div className="section-card__body">
        <div>
          <div className="section-card__name-row">
            <span className={cx("section-card__name", isPlanned && "section-card__name--muted")}>
              {section.name}
            </span>
            <span className={cx("section-card__status", statusClass("section-card__status", section.status))}>
              {STATUS_LABELS[section.status]}
            </span>
          </div>
          <div className="section-card__meta">{sectionMeta(section)}</div>
        </div>

        <ProgressMetricCell progress={section.progress_pct} status={section.status} />

        <MetricCell label="İş Kalemleri" placeholder={section.boq_item_count}>
          {section.boq_item_count.count}
        </MetricCell>

        <MetricCell
          label={STATUS_BUDGET_LABEL[section.status]}
          valueClassName="section-card__metric-value section-card__metric-value--money"
          placeholder={section.budget}
        >
          {formatCompactCurrency(section.budget.value ?? 0)}
        </MetricCell>

        <MetricCell label={STATUS_WORKER_LABEL[section.status]} placeholder={section.worker_count}>
          {section.worker_count.count}
        </MetricCell>

        <div className="section-card__action">
          <Link
            href={detayHref}
            className={cx(
              "section-card__action-btn",
              section.status === "active"
                ? "section-card__action-btn--solid"
                : "section-card__action-btn--ghost",
            )}
          >
            Detay →
          </Link>
        </div>
      </div>
    </div>
  );
}
