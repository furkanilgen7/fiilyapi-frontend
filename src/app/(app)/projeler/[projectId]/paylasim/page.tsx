"use client";

import { useParams, usePathname } from "next/navigation";

import { LandShareTableView } from "@/components/project-summary/LandShareTableView";

// F-PKK T3 · Paylaşım Tablosu (`Kat Karşılığı - Paylaşım`). Sayfa yalnız rota
// parametresini çözer; ekranın kendisi bileşendedir.
export default function ProjectAllocationPage() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  return <LandShareTableView projectId={projectId} activePath={pathname} />;
}
