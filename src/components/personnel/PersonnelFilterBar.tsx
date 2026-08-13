import { Input, Select } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";

import { STATUS_ON_LEAVE_PENDING_REASON } from "./personnel-list-labels";
import "./personnel-list.css";

export type PersonnelStatusFilter = "active" | "inactive" | undefined;

export interface PersonnelProjectOption {
  id: string;
  name: string;
}

export interface PersonnelFilterBarProps {
  query: string;
  /** `undefined` ⇒ "Tüm Projeler". */
  projectId: string | undefined;
  projectOptions: readonly PersonnelProjectOption[];
  trade: string | undefined;
  tradeOptions: readonly string[];
  status: PersonnelStatusFilter;
  onQueryChange: (query: string) => void;
  onProjectChange: (projectId: string | undefined) => void;
  onTradeChange: (trade: string | undefined) => void;
  onStatusChange: (status: PersonnelStatusFilter) => void;
}

/**
 * P 117-125 · süzgeç şeridi: arama (118-121) · proje (122, F-İK T2'den beri
 * GERÇEK — `GET /personnel?project_id=` SUNUCUDA süzer) · meslek (123, GERÇEK
 * ama İSTEMCİDE) · durum (124, GERÇEK; "İzinde" basılır ama devre-dışı —
 * spec §1/K, `is_active`e sessizce eşlenmez).
 *
 * Ham `<select>`/`<input>` yazılmaz; `ui/` primitive'leri kullanılır.
 */
export function PersonnelFilterBar({
  query,
  projectId,
  projectOptions,
  trade,
  tradeOptions,
  status,
  onQueryChange,
  onProjectChange,
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

      {/* 122 — seçenekler proje listesinden; seçim SUNUCUYA `project_id` gider */}
      <Select
        aria-label="Proje filtresi"
        value={projectId ?? ""}
        onChange={(event) =>
          onProjectChange(event.target.value === "" ? undefined : event.target.value)
        }
        data-testid="personel-filter-project"
      >
        <option value="">Tüm Projeler</option>
        {projectOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
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
