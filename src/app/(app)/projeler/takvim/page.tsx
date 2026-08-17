import { Suspense } from "react";

import { ProjectTimelineView } from "@/components/project-timeline/ProjectTimelineView";

/**
 * Proje Takvimi — Gantt (F-TKV, mockup `Proje Takvimi.dc.html`).
 *
 * 🔴 K1: giriş noktası `/projeler` liste ekranındaki bağlantıdır; sidebar'a
 * DOKUNULMAZ (tek nav satırı 44 kareyi birden oynatır).
 *
 * Statik `takvim` segmenti kardeşi `[projectId]`den ÖNCE eşleşir (Next.js
 * segment önceliği: literal > dinamik), bu yüzden proje detayını gölgelemez.
 *
 * `Suspense` zorunlu: görünüm `useSearchParams` okur (`ProjectsView` deseni).
 */
export default function ProjectTimelinePage() {
  return (
    <Suspense>
      <ProjectTimelineView />
    </Suspense>
  );
}
