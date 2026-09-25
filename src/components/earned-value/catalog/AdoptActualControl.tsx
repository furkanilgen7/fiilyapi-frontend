"use client";

import { useState } from "react";

import { AnchoredPopover, Button } from "@/components/ui";
import { formatUnitRate } from "@/lib/earned-value";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useAdoptEvCatalogActual } from "@/lib/api/hooks/useEvCatalog";
import type { EvCatalogItemRead } from "@/lib/api/models";

interface AdoptActualControlProps {
  item: EvCatalogItemRead;
  onAdopted: (message: string) => void;
}

const LABEL = "Gerçekleşeni standart yap";

/** ↺ yerine çizilen "geri döndür" oku (yeni Unicode glif yok — symbol-subset-guard). */
function AdoptIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2" strokeLinecap="round" />
      <path d="M3 2.5v3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * KAT:153-161 + :172 — ↺ düğmesi ve onay popover'ı.
 *
 * ⚠️ B1'de uç HER ZAMAN 409 döner (`CATALOG_NO_ACTUAL`): bu kontrol yalnız
 * ortalama varken basılır (bugün hiç görünmez); yine de 409 gelirse backend'in
 * Türkçe metni popover'da kalır.
 */
export function AdoptActualControl({ item, onAdopted }: AdoptActualControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const adopt = useAdoptEvCatalogActual();
  const standard = formatUnitRate(item.standard_unit_mhr);
  const average = formatUnitRate(item.actual.avg);

  function close() {
    adopt.reset();
    setIsOpen(false);
  }

  function confirm() {
    adopt.mutate(item.id, {
      onSuccess: () => {
        setIsOpen(false);
        onAdopted(`${item.name} standardı ${standard} → ${average} a-s/${item.uom} yapıldı`);
      },
    });
  }

  return (
    <span className="ev-cat-adopt">
      <button
        type="button"
        className="ev-cat-adopt__btn"
        aria-label={LABEL}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <AdoptIcon />
      </button>
      {isOpen && (
        <AnchoredPopover label={LABEL} onClose={close} className="ev-cat-pop" escapeOverflow>
          <div className="ev-cat-pop__title">{`Gerçekleşeni (${average}) standart yap?`}</div>
          <p className="ev-cat-pop__text">
            {`Standart ${standard} → ${average} a-s/${item.uom} · ${item.name} ${item.actual.site_count} şantiye ortalaması. Mevcut bütçeler değişmez; yeni öneriler bu oranı kullanır.`}
          </p>
          {adopt.isError && <p className="ev-cat-pop__error">{backendErrorMessage(adopt.error)}</p>}
          <div className="ev-cat-pop__actions">
            <Button variant="secondary" size="sm" onClick={close} disabled={adopt.isPending}>
              Vazgeç
            </Button>
            <Button size="sm" onClick={confirm} disabled={adopt.isPending}>
              Standart yap
            </Button>
          </div>
        </AnchoredPopover>
      )}
    </span>
  );
}
