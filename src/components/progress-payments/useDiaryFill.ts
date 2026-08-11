"use client";

import { useState } from "react";

import { backendErrorMessage } from "@/lib/api/error-message";

import {
  DIARY_FILL_ERROR_FALLBACK,
  buildDiaryFillNotice,
  type DiaryFillApplication,
  type DiaryFillNotice,
  type DiarySuggestionEnvelope,
} from "./diary-fill";

// F-SD T5 · "Günlükten Doldur" akışının DURUM MAKİNESİ — iki hakediş formu
// (işveren + taşeron) AYNI adımları izler: uç çağrılır → öneri satırlara
// uygulanır → üzerine yazma varsa ONAY sorulur → uygulanır → görünür özet.
// İki formda iki kopya state yazmamak için buraya çıkarıldı; forma özel olan
// tek şey `fetchSuggestion` (hangi uç) ve `apply` (hangi satır tipi).

/** `useQuery(...).refetch()` sonucunun bu akışın ihtiyaç duyduğu dar hâli. */
export interface DiarySuggestionFetchResult<TLine> {
  data?: DiarySuggestionEnvelope<TLine>;
  error: unknown;
}

export interface UseDiaryFillParams<TLine, TRow> {
  fetchSuggestion: () => Promise<DiarySuggestionFetchResult<TLine>>;
  apply: (lines: readonly TLine[]) => DiaryFillApplication<TRow>;
  commit: (application: DiaryFillApplication<TRow>) => void;
}

export interface DiaryFillController {
  notice: DiaryFillNotice | null;
  isPending: boolean;
  /** `null` = onay penceresi kapalı; sayı = üzerine yazılacak satır sayısı. */
  confirmOverwriteCount: number | null;
  run: () => void;
  confirmOverwrite: () => void;
  cancelOverwrite: () => void;
}

export function useDiaryFill<TLine, TRow>({
  fetchSuggestion,
  apply,
  commit,
}: UseDiaryFillParams<TLine, TRow>): DiaryFillController {
  const [notice, setNotice] = useState<DiaryFillNotice | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [pending, setPending] = useState<{
    application: DiaryFillApplication<TRow>;
    notice: DiaryFillNotice;
  } | null>(null);

  function run() {
    setNotice(null);
    setPending(null);
    setIsPending(true);
    void fetchSuggestion()
      .then((result) => {
        if (!result.data) {
          // Uç hata verdiyse SESSİZ KALINMAZ — Türkçe gerekçe basılır.
          setNotice({
            variant: "warning",
            text: backendErrorMessage(result.error, DIARY_FILL_ERROR_FALLBACK),
          });
          return;
        }
        const suggestion = result.data;
        const application = apply(suggestion.lines);
        const nextNotice = buildDiaryFillNotice(application.plan, {
          lineCount: suggestion.lines.length,
          skippedUnbridgedCount: suggestion.skipped_unbridged_count,
          reason: suggestion.reason,
        });
        // Üzerine yazma VARSA önce onay sorulur; kullanıcının elle girdiği
        // miktar onaysız değiştirilmez.
        if (application.plan.overwriteCount > 0) {
          setPending({ application, notice: nextNotice });
          return;
        }
        commit(application);
        setNotice(nextNotice);
      })
      .catch((error: unknown) => {
        setNotice({
          variant: "warning",
          text: backendErrorMessage(error, DIARY_FILL_ERROR_FALLBACK),
        });
      })
      .finally(() => setIsPending(false));
  }

  function confirmOverwrite() {
    if (!pending) return;
    commit(pending.application);
    setNotice(pending.notice);
    setPending(null);
  }

  function cancelOverwrite() {
    setPending(null);
    setNotice({
      variant: "warning",
      text: "Günlükten doldurma iptal edildi; girdiğiniz miktarlar korundu.",
    });
  }

  return {
    notice,
    isPending,
    confirmOverwriteCount: pending?.application.plan.overwriteCount ?? null,
    run,
    confirmOverwrite,
    cancelOverwrite,
  };
}
