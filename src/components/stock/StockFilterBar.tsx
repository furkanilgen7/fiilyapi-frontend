import { Button, Input, Select } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import type { StockCategory, StockStatus } from "@/lib/api/hooks/useStockItems";

import {
  STOCK_CATEGORY_LABELS,
  STOCK_CATEGORY_OPTIONS,
  STOCK_STATUS_SEGMENTS,
} from "./stock-labels";
import "./stock.css";

export interface StockFilterBarProps {
  status: StockStatus | undefined;
  category: StockCategory | undefined;
  query: string;
  onStatusChange: (status: StockStatus | undefined) => void;
  onCategoryChange: (category: StockCategory | undefined) => void;
  onQueryChange: (query: string) => void;
}

/**
 * E3 92-104 · süzgeç şeridi: durum segmenti (93-97) · kategori seçimi (99) ·
 * arama kutusu (100-103).
 *
 * ÜÇÜ DE SUNUCU SÜZGECİDİR (`GET /stock/summary` sorgu parametreleri
 * `status`/`category`/`q`) — liste istemcide filtrelenmez, aksi halde sayfalanan
 * kümenin dışındaki kayıtlar sessizce kaybolurdu. Ham `<select>`/`<input>`
 * yazılmaz; `ui/` primitive'leri kullanılır.
 */
export function StockFilterBar({
  status,
  category,
  query,
  onStatusChange,
  onCategoryChange,
  onQueryChange,
}: StockFilterBarProps) {
  return (
    <div className="stok-filters">
      {/* 93-97 */}
      <div className="stok-segment" role="group" aria-label="Durum filtresi">
        {STOCK_STATUS_SEGMENTS.map((segment) => {
          const isActive = segment.value === status;
          return (
            <Button
              key={segment.label}
              variant="ghost"
              size="sm"
              className={cx(
                "stok-segment__item",
                isActive && "stok-segment__item--active",
              )}
              aria-pressed={isActive}
              onClick={() => onStatusChange(segment.value)}
            >
              {segment.label}
            </Button>
          );
        })}
      </div>

      {/* 99 — seçenekler ŞEMADAN gelir (mockup'ın "Boya-Kaplama"sı enum'da yok) */}
      <Select
        aria-label="Kategori filtresi"
        value={category ?? ""}
        onChange={(event) =>
          onCategoryChange(
            event.target.value === "" ? undefined : (event.target.value as StockCategory),
          )
        }
      >
        <option value="">Tüm Kategoriler</option>
        {STOCK_CATEGORY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {STOCK_CATEGORY_LABELS[option]}
          </option>
        ))}
      </Select>

      {/* 100-103 */}
      <Input
        className="stok-filters__search"
        type="search"
        aria-label="Malzeme ara"
        placeholder="Malzeme ara..."
        leftIcon={<SearchIcon />}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
  );
}
