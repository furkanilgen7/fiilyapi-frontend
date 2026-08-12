import Link from "next/link";

import { Badge } from "@/components/ui";
import { SOURCE_AVATAR_GRADIENT } from "@/components/personnel/personnel-list-labels";
import { initials } from "@/lib/shell/initials";
import type { PersonnelDetailResponse } from "@/lib/api/hooks/usePersonnelDetail";

import {
  HEADER_FIELD_PENDING_REASON,
  PAYROLL_PENDING_REASON,
  PENDING_VALUE,
  SOURCE_BADGE_VARIANT,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  WORKER_SOURCE_LABELS,
} from "./personnel-detail-labels";

export interface PersonnelHeaderCardProps {
  personnel: PersonnelDetailResponse;
  editHref: string;
}

/** Pending satır hücresi — 57-61 alt şerit (SGK/İşe Giriş/Vergi/IBAN). */
function PendingStrip({ label }: { label: string }) {
  return (
    <div>
      <div className="pd-hero__strip-label">{label}</div>
      <div
        className="pd-hero__strip-value pd-hero__strip-value--pending"
        title={HEADER_FIELD_PENDING_REASON}
      >
        {PENDING_VALUE}
      </div>
    </div>
  );
}

/**
 * PD 29-63 · Başlık kartı. GERÇEK alanlar: ad (`full_name`) · Aktif/Pasif
 * rozeti (`is_active`) · Tür rozeti (`source`, etiket `diary-labels`ten) ·
 * meslek (`trade`). Telefon/e-posta/şehir/SGK/vergi/IBAN/ücret/"Bu Ay Net"
 * PENDING — basılır ama devre-dışı + GÖRÜNÜR gerekçeli (uydurma değer YOK).
 */
export function PersonnelHeaderCard({ personnel, editHref }: PersonnelHeaderCardProps) {
  const statusKey = personnel.is_active ? "active" : "inactive";

  return (
    <section className="pd-hero" data-testid="personnel-header-card">
      <div className="pd-hero__top">
        <span
          className="pd-hero__avatar"
          aria-hidden="true"
          style={{ backgroundImage: SOURCE_AVATAR_GRADIENT[personnel.source] }}
        >
          {initials(personnel.full_name)}
        </span>

        <div className="pd-hero__identity">
          <div className="pd-hero__badges">
            <h1 className="pd-hero__name">{personnel.full_name}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[statusKey]}>{STATUS_LABEL[statusKey]}</Badge>
            <Badge variant={SOURCE_BADGE_VARIANT[personnel.source]}>
              {WORKER_SOURCE_LABELS[personnel.source]}
            </Badge>
          </div>
          {/* 38 — mockup "Meslek · Şantiye"; şantiye bilgisi sözleşmede YOK,
              zarif düşüş: yalnız GERÇEK meslek basılır, uydurma şantiye adı YOK. */}
          <div className="pd-hero__subtitle">{personnel.trade ?? "—"}</div>
          {/* 39-43 — telefon/e-posta/şehir TAMAMI pending, satır SİLİNMEZ. */}
          <div className="pd-hero__contact" data-testid="personnel-header-contact">
            <span
              className="pd-hero__contact-item pd-hero__contact-item--pending"
              title={HEADER_FIELD_PENDING_REASON}
            >
              📞 {PENDING_VALUE}
            </span>
            <span
              className="pd-hero__contact-item pd-hero__contact-item--pending"
              title={HEADER_FIELD_PENDING_REASON}
            >
              ✉️ {PENDING_VALUE}
            </span>
            <span
              className="pd-hero__contact-item pd-hero__contact-item--pending"
              title={HEADER_FIELD_PENDING_REASON}
            >
              📍 {PENDING_VALUE}
            </span>
          </div>
        </div>

        {/* 45-54 — Günlük Ücret / Bu Ay Net, İKİSİ DE pending. */}
        <div className="pd-hero__stats">
          <div className="pd-hero__stat pd-hero__stat--blue">
            <div className="pd-hero__stat-label">Günlük Ücret</div>
            <div
              className="pd-hero__stat-value pd-hero__stat-value--pending"
              title={HEADER_FIELD_PENDING_REASON}
            >
              {PENDING_VALUE}
            </div>
          </div>
          <div className="pd-hero__stat pd-hero__stat--green">
            <div className="pd-hero__stat-label">Bu Ay Net</div>
            <div
              className="pd-hero__stat-value pd-hero__stat-value--pending"
              title={HEADER_FIELD_PENDING_REASON}
            >
              {PENDING_VALUE}
            </div>
          </div>
        </div>
      </div>

      {/* 56-62 — alt şerit: SGK/İşe Giriş/Meslek/Vergi/IBAN */}
      <div className="pd-hero__strip">
        <PendingStrip label="SGK No" />
        <PendingStrip label="İşe Giriş" />
        <div>
          <div className="pd-hero__strip-label">Meslek</div>
          <div className="pd-hero__strip-value">{personnel.trade ?? "—"}</div>
        </div>
        <PendingStrip label="Vergi No" />
        <PendingStrip label="IBAN" />
      </div>

      {/* 21-24 — mockup'ın fixed üst şeridindeki aksiyonlar; PD kendi üst
          barını basmaz (kabuk canon), bu yüzden aksiyonlar hero kartına
          taşındı (`SectionHeroCard` deseni). */}
      <div className="pd-hero__actions">
        <Link href={editHref} className="pd-hero__btn pd-hero__btn--ghost">
          Düzenle
        </Link>
        <button
          type="button"
          className="pd-hero__btn pd-hero__btn--solid"
          disabled
          title={PAYROLL_PENDING_REASON}
        >
          Bordroyu Gör
        </button>
      </div>
    </section>
  );
}
