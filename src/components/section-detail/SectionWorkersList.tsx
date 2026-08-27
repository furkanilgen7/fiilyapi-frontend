import { Badge } from "@/components/ui/badge/Badge";
import {
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
} from "@/components/timesheet/timesheet-codes";

import type { SectionWorkerGroup } from "./section-workers";

/**
 * F-BLMPUAN — "Bu Bölümdeki İşçiler" kartının GÖVDESİ (mockup D215-250).
 *
 * Rozet etiketi ve rengi UYDURULMAZ: `timesheet-codes` üzerinden tek kaynaktan
 * gelir (`WORKER_SOURCE_LABELS` → `diary-labels`, renk →
 * `personnel-list-labels/resolveSourceBadgeVariant`). Mockup renkleriyle
 * BİREBİR tutar: D221 `#dbeafe`/`#2563eb` = `primary` (Şirket) ·
 * D228 `#fef3c7`/`#d97706` = `warning` (Taşeron) · D242 `#f1f5f9`/`#64748b`
 * = `neutral` (Genel). `WorkerSource` BEŞ üyelidir; mockup'ta çizilmeyen
 * `freelance`/`intern` de aynı çözümleyiciden nötr rozetle basılır.
 *
 * 🔴 YÜKLEME ve HATA dalları AYRI basılır (emsal: aynı ekranın BOQ dalı).
 * Veri yokken boş listeye düşmek kullanıcıya *"bu bölümde işçi yok"* YALANINI
 * söylerdi. Ve boş liste *"modül yok"* DEMEZ — *"bu ay bu bölümde kayıt yok"*
 * der: puantaj artık bu bölüme KIRILIYOR, yalnız o ayın kaydı boş.
 */
export interface SectionWorkersListProps {
  groups: readonly SectionWorkerGroup[];
  isLoading: boolean;
  isError: boolean;
  /** "Ağustos 2026" — boş hâlin hangi AYA ait olduğunu söyler. */
  periodLabel: string;
}

export function SectionWorkersList({
  groups,
  isLoading,
  isError,
  periodLabel,
}: SectionWorkersListProps) {
  if (isError) {
    return <p className="section-detail__message">Puantaj verisi yüklenemedi</p>;
  }
  if (isLoading) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="section-detail__message" data-testid="section-workers-empty">
        {periodLabel} döneminde bu bölümde puantaj kaydı yok.
      </p>
    );
  }

  return (
    <ul className="section-workers" data-testid="section-workers">
      {groups.map((group) => (
        <li key={group.key} className="section-workers__row" data-testid="section-workers-row">
          <span className="section-workers__lead">
            {/* D221/D228/D242 */}
            <Badge variant={resolveSourceBadgeVariant(group.source)}>
              {resolveWorkerSourceLabel(group.source)}
            </Badge>
            {/* D222/D229 */}
            <span className="section-workers__label">{group.label}</span>
          </span>
          {/* D224 — sayı GERÇEK matristen; mockup'ın "14 kişi" sabiti kopyalanmaz. */}
          <span className="section-workers__count">{group.count} kişi</span>
        </li>
      ))}
    </ul>
  );
}
