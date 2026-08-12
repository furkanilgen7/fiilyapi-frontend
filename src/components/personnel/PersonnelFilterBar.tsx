import { Input, Select } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";

import {
  PROJECT_FILTER_PENDING_REASON,
  STATUS_ON_LEAVE_PENDING_REASON,
} from "./personnel-list-labels";
import "./personnel-list.css";

export type PersonnelStatusFilter = "active" | "inactive" | undefined;

export interface PersonnelFilterBarProps {
  query: string;
  trade: string | undefined;
  tradeOptions: readonly string[];
  status: PersonnelStatusFilter;
  onQueryChange: (query: string) => void;
  onTradeChange: (trade: string | undefined) => void;
  onStatusChange: (status: PersonnelStatusFilter) => void;
}

/**
 * P 117-125 · süzgeç şeridi: arama (118-121) · proje (122, pending devre-dışı)
 * · meslek (123, GERÇEK ama İSTEMCİDE) · durum (124, GERÇEK; "İzinde" basılır
 * ama devre-dışı — spec §1/K, `is_active`e sessizce eşlenmez).
 *
 * Ham `<select>`/`<input>` yazılmaz; `ui/` primitive'leri kullanılır.
 */
export function PersonnelFilterBar({
  query,
  trade,
  tradeOptions,
  status,
  onQueryChange,
  onTradeChange,
  onStatusChange,
}: PersonnelFilterBarProps) {
  return (
    <div className="personel-filters">
      {/* 118-121 */}
      <Input
        className="personel-filters__search"
        type="search"
        aria-label="Personel ara"
        placeholder="Personel ara..."
        leftIcon={<SearchIcon />}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {/* 122 — backend süzgeci yok (spec K-B); devre-dışı + görünür gerekçe */}
      <Select
        aria-label="Proje filtresi"
        disabled
        title={PROJECT_FILTER_PENDING_REASON}
        defaultValue=""
        data-testid="personel-filter-project"
      >
        <option value="">Tüm Projeler</option>
      </Select>

      {/* 123 — seçenekler yüklenen kadrodan TÜRETİLİR (backend `trade` parametresi yok) */}
      <Select
        aria-label="Meslek filtresi"
        value={trade ?? ""}
        onChange={(event) =>
          onTradeChange(event.target.value === "" ? undefined : event.target.value)
        }
      >
        <option value="">Tüm Meslekler</option>
        {tradeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      {/* 124 — `is_active` GERÇEK; "İzinde" basılır ama devre-dışı */}
      <Select
        aria-label="Durum filtresi"
        value={status ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onStatusChange(next === "" ? undefined : (next as "active" | "inactive"));
        }}
      >
        <option value="">Tüm Durumlar</option>
        <option value="active">Aktif</option>
        <option value="on_leave" disabled title={STATUS_ON_LEAVE_PENDING_REASON}>
          İzinde
        </option>
        <option value="inactive">Pasif</option>
      </Select>
    </div>
  );
}
