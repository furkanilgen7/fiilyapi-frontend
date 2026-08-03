"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchIcon } from "@/components/ui/icons";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatPeriod } from "@/lib/format";

import {
  parseSubcontractorFilters,
  recentPeriods,
  SUBCONTRACTOR_STATUS_FILTER_OPTIONS,
  withSubcontractorFilterParams,
  type SubcontractorFilterPatch,
} from "./subcontractor-filters";
import "./subcontractor-progress-payments.css";

const ALL_VALUE = "";
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;
/** Dönem seçicide gösterilecek geçmiş ay sayısı (bkz. `recentPeriods` yorumu). */
const PERIOD_OPTION_COUNT = 12;

function periodValue(year: number, month: number): string {
  return `${year}-${month}`;
}

/**
 * Ekran 2 filtre çubuğu (brief §Filtreler): Proje/Dönem/Durum seçicileri +
 * sağa yaslı arama kutusu, dördü de URL query'sine yazılır. Arama metni
 * `useDebouncedValue` ile sakinleştirilir (`AuditLogScreen` deseni) — her
 * tuş vuruşunda URL/ağ isteği ATILMAZ; seçiciler anında yazar
 * (`ProjectsView.handleTabChange` deseni, debounce gerekmez).
 */
export function SubcontractorProgressPaymentsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseSubcontractorFilters(searchParams);

  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const projectsQuery = useProjects();

  function pushPatch(patch: SubcontractorFilterPatch) {
    const next = withSubcontractorFilterParams(searchParams, patch);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce edilmiş arama metni URL'deki `q`dan FARKLIYSA yazılır —
  // yalnız `debouncedSearch` değiştiğinde tetiklenir (`searchParams`/
  // `pushPatch` her URL değişiminde yeniden oluşur, bağımlılığa eklenirse
  // sonsuz döngü/gereksiz tetiklenme olurdu — `UsersScreen.tsx`'teki
  // sayfa-sınırı senkronizasyonuyla aynı gerekçe).
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      pushPatch({ q: debouncedSearch || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="thk-filters">
      <Select
        aria-label="Proje filtresi"
        value={filters.projectId ?? ALL_VALUE}
        onChange={(event) => pushPatch({ project_id: event.target.value || null })}
      >
        <option value={ALL_VALUE}>Tüm Projeler</option>
        {projectsQuery.data?.items.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Dönem filtresi"
        value={
          filters.periodYear && filters.periodMonth
            ? periodValue(filters.periodYear, filters.periodMonth)
            : ALL_VALUE
        }
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) {
            pushPatch({ period_year: null, period_month: null });
            return;
          }
          const [year, month] = raw.split("-").map(Number);
          pushPatch({ period_year: year, period_month: month });
        }}
      >
        <option value={ALL_VALUE}>Tüm Dönemler</option>
        {recentPeriods(new Date(), PERIOD_OPTION_COUNT).map(({ year, month }) => (
          <option key={periodValue(year, month)} value={periodValue(year, month)}>
            {formatPeriod(year, month)}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Durum filtresi"
        value={filters.status ?? ALL_VALUE}
        onChange={(event) => pushPatch({ status: event.target.value || null })}
      >
        <option value={ALL_VALUE}>Tüm Durumlar</option>
        {SUBCONTRACTOR_STATUS_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <div className="thk-filters__search">
        <Input
          leftIcon={<SearchIcon />}
          placeholder="Taşeron ara..."
          aria-label="Taşeron ara"
          maxLength={SEARCH_MAX_LENGTH}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
    </div>
  );
}
