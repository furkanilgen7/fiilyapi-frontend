"use client";

import { useEffect, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { usePreviousAllocation } from "@/lib/api/hooks/useEvDay";
import { backendErrorMessage } from "@/lib/api/error-message";
import type { EvCodeNode, EvDayView } from "@/lib/api/models";
import { formatDateDots } from "@/lib/format";

import { bulkAssign, copyPreviousPattern, distributeRemaining } from "./allocation-actions";
import type { AllocationDraft, RowKey } from "./allocation-model";
import { buildCodeIndex, isAllocatableCode } from "./code-tree";

export interface Flash {
  tone: "ok" | "error";
  message: string;
}

/** İ:602 `flash` — 3 sn. */
const FLASH_MS = 3000;

export interface AllocationActionsInput {
  siteId: string;
  day: string;
  view: EvDayView;
  draft: AllocationDraft;
  codeTree: UseQueryResult<EvCodeNode[], Error>;
  onDraftChange: (update: (draft: AllocationDraft) => AllocationDraft) => void;
  selected: ReadonlySet<RowKey>;
  clearSelection: () => void;
}

/**
 * Saat Dağıtımı araç çubuğunun yan etkili eylemleri: dünkü deseni iste ve
 * uygula (B2-7), orantılı dağıt, toplu ata. KAYIT burada DEĞİL: çekirdeğin
 * tek düğmesi `onBeforeSave` ile yazar (S1, `before-save.ts`).
 * Hesaplar saf `allocation-actions`tadır; burada yalnız ağ + bildirim.
 */
export function useAllocationActions(input: AllocationActionsInput) {
  const { view, draft, onDraftChange } = input;
  const [flash, setFlash] = useFlash();
  const copy = useCopyPrevious(input, setFlash);

  function distribute() {
    const result = distributeRemaining(draft, view.rows);
    onDraftChange(() => result.draft);
    setFlash({
      tone: "ok",
      message: "Kalan saatler satırdaki mevcut dağılıma (boş satırlarda ekip toplamlarına) göre orantılı dağıtıldı",
    });
  }

  function bulkApply(nodeId: string, text: string, label: string) {
    const keys = [...input.selected];
    onDraftChange((current) => bulkAssign(current, keys, nodeId, text));
    input.clearSelection();
    setFlash({ tone: "ok", message: `${keys.length} kişiye ${label} için ${text} sa atandı` });
  }

  return { flash, ...copy, distribute, bulkApply };
}

/** İ:602 `flash` — bildirim `FLASH_MS` sonra kalkar; zamanlayıcı temizlenir. */
function useFlash(): [Flash | null, (flash: Flash) => void] {
  const [flash, setFlash] = useState<Flash | null>(null);
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);
  return [flash, setFlash];
}

/**
 * B2-7 "Dünkü dağılımı kopyala": son gönderilmiş günün desenini ister (uç
 * varsayılan KAPALI; düğmeye basınca `refetch`), güncel kod ağacıyla oransız /
 * artık olmayan kodu eler ve yalnız boş/eksik satırları doldurur.
 */
function useCopyPrevious(input: AllocationActionsInput, setFlash: (flash: Flash) => void) {
  const [isCopying, setCopying] = useState(false);
  const previous = usePreviousAllocation(input.siteId, input.day, false);

  async function copyPrevious() {
    setCopying(true);
    try {
      const [prev, tree] = await Promise.all([previous.refetch({ throwOnError: true }), input.codeTree.refetch()]);
      const pattern = prev.data;
      if (!pattern || pattern.day === null) {
        setFlash({ tone: "error", message: "Kopyalanacak gönderilmiş bir gün yok." });
        return;
      }
      const allowed = isAllocatableCode(buildCodeIndex(tree.data ?? []));
      const result = copyPreviousPattern(input.draft, pattern, input.view.rows, allowed);
      input.onDraftChange(() => result.draft);
      setFlash({ tone: "ok", message: copyMessage(pattern.day, result.filledRows) });
    } catch (error: unknown) {
      setFlash({ tone: "error", message: backendErrorMessage(error, "Dünkü dağılım alınamadı.") });
    } finally {
      setCopying(false);
    }
  }

  return { isCopying, copyPrevious };
}

/** İ:712 bildirimi — "22.09 dağılım deseni kopyalandı · yalnız boş/eksik satırlar dolduruldu". */
function copyMessage(day: string, filledRows: number): string {
  if (filledRows === 0) return `${formatDateDots(day)} deseni kopyalanmadı — boş/eksik satır yok`;
  return `${formatDateDots(day)} dağılım deseni kopyalandı · yalnız boş/eksik satırlar dolduruldu`;
}
