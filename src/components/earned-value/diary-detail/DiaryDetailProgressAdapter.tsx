"use client";

/**
 * ═══ PLANLAMA ↔ GÜNLÜK KAYIT DETAYI ADAPTÖRÜ (DET-1.3 · spec §2.7) ═══
 *
 * Emsal: `earned-value/diary/DiaryProgressAdapter.tsx` (günlük ekranı).
 * Çekirdek detay sayfası (`components/site-diary-detail/**`) planlama kodunu
 * IMPORT ETMEZ; iki taraf yalnız `site-diary-detail/detail-extension.ts`
 * tipleriyle konuşur:
 *
 *   çekirdek (`SiteDiaryDetailView`) ──onExtensionContext(ctx)──▶ bu adaptör
 *   çekirdek ◀─────────── extension: DiaryDetailExtension ─────── bu adaptör
 *
 * Planlama modülü müşteride kurulu değilse rota sayfası bu dosya yerine
 * çekirdek görünümü basar; başka hiçbir yer değişmez.
 */
import { useState } from "react";

import type { DiaryDetailContext } from "@/components/site-diary-detail/detail-extension";
import { SiteDiaryDetailView } from "@/components/site-diary-detail/SiteDiaryDetailView";

import { useDiaryDetailExtension } from "./useDiaryDetailExtension";
import "../diary/diary-progress.css";
import "./diary-detail-progress.css";

/** Bölüm rotası — `/projeler/[p]/santiyeler/[s]/bolumler/[b]/gunluk-kayit/[entryId]`. */
export function SiteDiaryDetailProgressView() {
  const [context, setContext] = useState<DiaryDetailContext | null>(null);
  const extension = useDiaryDetailExtension(context);
  // `extension === undefined` → çekirdek uzantısız (planlamasız) davranışta kalır.
  return <SiteDiaryDetailView extension={extension} onExtensionContext={setContext} />;
}
