import { cx } from "@/lib/cx";

import type { StripValues } from "./allocation-model";
import { formatHours } from "./hours";

/**
 * 4'lü şerit — İ:392-397: Puantaj toplamı · Dağıtılan · Dağıtılmamış (K14,
 * 0 ise yeşil, değilse sarı) · Taşeron. Temiz taslakta backend toplamları,
 * düzenlerken anında önizleme (`stripValues`).
 */
export function AllocationStrip({ values }: { values: StripValues }) {
  const isBalanced = values.unallocated === 0;
  return (
    <dl className="ev-diary-strip">
      <div className="ev-diary-strip__item">
        <dt>Puantaj toplamı</dt>
        <dd>
          {formatHours(values.source)} <span className="ev-diary-strip__unit">a-s</span>
        </dd>
      </div>
      <div className="ev-diary-strip__item ev-diary-strip__item--allocated">
        <dt>Dağıtılan</dt>
        <dd>{formatHours(values.allocated)}</dd>
      </div>
      <div className={cx("ev-diary-strip__item", isBalanced ? "ev-diary-strip__item--ok" : "ev-diary-strip__item--warn")}>
        <dt>Dağıtılmamış</dt>
        <dd>{formatHours(values.unallocated)}</dd>
      </div>
      <div className="ev-diary-strip__item ev-diary-strip__item--sub">
        <dt>Taşeron</dt>
        <dd>{formatHours(values.subcontractor)}</dd>
      </div>
    </dl>
  );
}
