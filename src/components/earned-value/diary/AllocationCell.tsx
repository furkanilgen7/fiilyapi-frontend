"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input/Input";
import { cx } from "@/lib/cx";
import { useSyncedFieldState } from "@/lib/hooks/useSyncedFieldState";

import { parseHoursInput } from "./hours";

export interface AllocationCellProps {
  text: string;
  label: string;
  disabled: boolean;
  onChange: (text: string) => void;
}

/**
 * Kişi × iş kodu saat hücresi — İ:468-472. Değer taslaktan gelir; toplu
 * eylemler (kopyala / orantılı dağıt / toplu ata) taslağı değiştirince hücre
 * `useSyncedFieldState` ile güncellenir, ama hücre ODAKTAYKEN ertelenir
 * (yazılan tuşlar ezilmez — O1 kanonu). Her tuş taslağa işlenir: satır
 * "Kalan"ı ve şerit anında önizlenir.
 */
export function AllocationCell({ text, label, disabled, onChange }: AllocationCellProps) {
  const isEditingRef = useRef(false);
  const [value, setValue] = useSyncedFieldState(text, () => isEditingRef.current);
  const parsed = parseHoursInput(value);
  const hasValue = parsed !== null && parsed > 0;
  return (
    <Input
      size="row"
      numeric
      inputMode="decimal"
      maxLength={6}
      aria-label={label}
      disabled={disabled}
      status={parsed === null ? "error" : "default"}
      className={cx("ev-diary-cell__input", hasValue && "ev-diary-cell__input--filled")}
      value={value}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={() => {
        isEditingRef.current = false;
      }}
      onChange={(event) => {
        setValue(event.target.value);
        onChange(event.target.value);
      }}
    />
  );
}
