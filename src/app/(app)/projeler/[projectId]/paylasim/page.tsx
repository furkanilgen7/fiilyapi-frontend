"use client";

import { useParams, usePathname } from "next/navigation";

import { LandShareTableView } from "@/components/project-summary/LandShareTableView";

// F-PKK T3 · Paylaşım Tablosu (`Kat Karşılığı - Paylaşım`). Sayfa yalnız rota
// parametresini çözer; ekranın kendisi bileşendedir.
export default function ProjectAllocationPage() {
  const pathname = usePathname();
  // URL-3 — rota parametresi artik "slug VEYA UUID"dur; cozumleme gorunumde.
  const { projectId: projectKey } = useParams<{ projectId: string }>();
  return <LandShareTableView projectKey={projectKey} activePath={pathname} />;
}
