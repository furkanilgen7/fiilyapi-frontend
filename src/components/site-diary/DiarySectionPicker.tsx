"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button/Button";
import { Checkbox } from "@/components/ui/checkbox/Checkbox";
import { SearchIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input/Input";
import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import { fetchBoqItemAllocations } from "@/lib/api/hooks/useBoqAllocations";
import { formatQuantity } from "@/lib/format";

import {
  buildSectionPickerOptions,
  type DiaryItemGroup,
  type DiarySectionPickerOption,
  type DiaryTreeSection,
} from "./diary-lines-tree";
import type { DiaryAddedLine } from "./form-state";

/** Tahsis okuması — kalem başına, YALNIZ seçici açılınca (N+1 değil: tek kalem, isteğe bağlı). */
export const DIARY_ITEM_ALLOCATIONS_QUERY_KEY = "diary-item-allocations";

export interface DiarySectionPickerProps {
  group: DiaryItemGroup;
  sections: readonly DiaryTreeSection[];
  onConfirm: (lines: DiaryAddedLine[]) => void;
  onClose: () => void;
  /**
   * Şantiyenin İş Kalemleri (BOQ) sayfası — tahsissiz bölüm için yönlendirme.
   * Kök ikizde proje çözülemediyse `null` → düz metin.
   */
  boqHref: string | null;
}

/** G5 (düzeltilmiş) — tahsissiz bölümün yönlendirme metni. */
export const ALLOCATE_FIRST_LABEL = "Önce İş Kalemleri'nde bölüme tahsis et →";

const SEARCH_MAX = 60;

/**
 * Ek Formlar M1 · kalem başlığındaki "+ Bölüm" seçicisi. Şantiyenin bölümleri:
 * bu kaleme BOQ tahsisi olanlar üstte (seçilebilir), tahsissizler "planlı 0"
 * altta PASİF + İş Kalemleri'ne tahsis bağlantısı (G5 düzeltmesi, CEO
 * 2026-09-25: backend tahsissiz bölüme satırı 422 ile reddeder — tahsis dışı
 * miktar YALNIZ Bölümsüz satıra girer). Zaten eklenmiş bölüm pasif
 * ("eklendi"). Bölümsüz iskeleti olmayan kalemde (G4) "Tahsis dışı ·
 * Bölümsüz" seçeneği en üstte. Çoklu seçim + "Tamam".
 *
 * Tahsis kümesi `GET /boq/items/{id}/allocations` ile YALNIZ bu kalem için,
 * seçici açıldığında okunur — sayfa yüklenirken her kalem için istek atılmaz.
 */
export function DiarySectionPicker({ group, sections, onConfirm, onClose, boqHref }: DiarySectionPickerProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlyMap<string, DiarySectionPickerOption>>(new Map());
  const itemId = group.boqItemId ?? "";
  const allocations = useQuery({
    enabled: itemId !== "",
    queryKey: [DIARY_ITEM_ALLOCATIONS_QUERY_KEY, itemId],
    queryFn: () => fetchBoqItemAllocations(itemId),
  });
  const options = buildSectionPickerOptions(group, sections, allocations.data?.allocations ?? [], query);

  function toggle(option: DiarySectionPickerOption) {
    const key = option.sectionId ?? "";
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, option);
      return next;
    });
  }

  function confirm() {
    onConfirm(
      [...selected.values()].map((option) => ({
        boqItemId: itemId,
        sectionId: option.sectionId,
        plannedQuantity: option.planned,
      })),
    );
  }

  const renderOption = (option: DiarySectionPickerOption, isSelectable = true) => {
    const key = option.sectionId ?? "";
    const isChecked = option.isPresent || selected.has(key);
    const planned =
      option.sectionId === null
        ? `planlı ${formatQuantity(option.planned)}`
        : allocations.isSuccess && option.planned !== "0"
          ? `${formatQuantity(option.planned)} ${group.unit}`
          : (option.code ?? "");
    return (
      <li key={key} className="diary-picker__option">
        <Checkbox
          label={option.label}
          checked={isChecked}
          disabled={option.isPresent || !isSelectable}
          onChange={() => toggle(option)}
        />
        <span className="diary-picker__planned">
          {planned}
          {option.isPresent ? " · eklendi" : ""}
        </span>
      </li>
    );
  };

  return (
    <AnchoredPopover label={`${group.description} için bölüm ekle`} onClose={onClose} className="diary-picker" escapeOverflow>
      <div className="diary-picker__search">
        <Input
          size="row"
          leftIcon={<SearchIcon />}
          aria-label="Bölüm ara"
          placeholder="Bölüm ara"
          maxLength={SEARCH_MAX}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="diary-picker__body">
        {options.unsectioned && (
          <>
            <p className="diary-picker__group">Tahsis dışı</p>
            <ul className="diary-picker__list">{renderOption(options.unsectioned)}</ul>
          </>
        )}
        {allocations.isLoading && <p className="diary-picker__message">Tahsisler yükleniyor…</p>}
        {allocations.isError && (
          <p className="diary-picker__message">
            BOQ tahsisleri okunamadı — bölümler tahsis ayrımı olmadan listeleniyor.
          </p>
        )}
        {allocations.isSuccess && options.allocated.length > 0 && (
          <>
            <p className="diary-picker__group">BOQ tahsisi olan</p>
            <ul className="diary-picker__list">{options.allocated.map((option) => renderOption(option))}</ul>
          </>
        )}
        {!allocations.isLoading && options.unallocated.length > 0 && (
          <>
            <p className="diary-picker__group">
              {allocations.isSuccess ? "Tahsis yok · planlı 0" : "Bölümler"}
            </p>
            {/* Tahsis bilgisi varsa tahsissiz bölüm SEÇİLEMEZ (backend 422). Tahsis
                okunamadıysa ayrım bilinmez — seçim açık, backend karar verir. */}
            <ul className="diary-picker__list">
              {options.unallocated.map((option) => renderOption(option, !allocations.isSuccess))}
            </ul>
            {allocations.isSuccess &&
              (boqHref ? (
                <Link href={boqHref} className="diary-picker__allocate">
                  {ALLOCATE_FIRST_LABEL}
                </Link>
              ) : (
                <p className="diary-picker__allocate">{ALLOCATE_FIRST_LABEL}</p>
              ))}
          </>
        )}
      </div>
      <div className="diary-picker__foot">
        <span className="diary-picker__count">{selected.size} bölüm seçili</span>
        <Button variant="ghost" size="sm" disabled={selected.size === 0} onClick={confirm}>
          Tamam
        </Button>
      </div>
    </AnchoredPopover>
  );
}
