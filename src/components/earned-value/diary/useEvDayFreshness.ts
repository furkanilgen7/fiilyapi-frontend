"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EV_DAY_KEYS } from "@/lib/api/hooks/useEvDay";
import { SITE_DIARY_ENTRY_QUERY_KEY } from "@/lib/api/hooks/useSiteDiary";

/**
 * Gün görünümü (kontrol listesi, kazanılmış/PF) günlüğün KAYDEDİLMİŞ hâlinden
 * hesaplanır. Çekirdek planlamayı bilmez (§2.7), yani kendi kaydından sonra EV
 * anahtarını tazeleyemez; yön planlama → çekirdek serbesttir: adaptör çekirdek
 * kaydının sorgu önbelleğini dinler ve gün görünümünü tazeler.
 *
 * - Kayıt açıldı / gönderildi / yeniden açıldı → `entryId`/`entryStatus` değişir.
 * - Taslak kaydedildi → kaydın sorgusu YENİDEN başarıyla çekilir
 *   (`dataUpdateCount > 1`; ilk yükleme sayılmaz, fazladan istek yok).
 */
export function useEvDayFreshness(
  siteId: string,
  day: string,
  entryId: string | null,
  entryStatus: string | null,
): void {
  const client = useQueryClient();
  const signature = `${entryId ?? ""}|${entryStatus ?? ""}`;
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = `${siteId}|${day}|${signature}`;
    if (before === null || siteId === "" || day === "") return;
    if (before.startsWith(`${siteId}|${day}|`) && before !== previous.current) {
      void client.invalidateQueries({ queryKey: [EV_DAY_KEYS.day, siteId, day] });
    }
  }, [client, siteId, day, signature]);

  useEffect(() => {
    if (siteId === "" || day === "" || entryId === null) return;
    return client.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      const [root, id] = event.query.queryKey as readonly unknown[];
      if (root !== SITE_DIARY_ENTRY_QUERY_KEY || id !== entryId) return;
      if (event.query.state.dataUpdateCount <= 1) return;
      void client.invalidateQueries({ queryKey: [EV_DAY_KEYS.day, siteId, day] });
    });
  }, [client, siteId, day, entryId]);
}
