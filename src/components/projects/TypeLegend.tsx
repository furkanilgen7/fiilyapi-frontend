import type { ReactNode } from "react";

import type { ProjectCounts } from "@/lib/api/hooks/useProjects";

import "./projects.css";

// Metinler mockup satir 75/82/89'dan aynen (spec §4.2).
const LEGEND: Array<{
  type: "taahhut" | "kendi_yatirim" | "kat_karsiligi";
  badge: string;
  desc: ReactNode;
}> = [
  {
    type: "taahhut",
    badge: "TAAHHÜT",
    desc: (
      <>İşveren adına yapılan işler. Gelir <strong>hakediş</strong> ile alınır, poz listesi işveren sözleşmesinden gelir.</>
    ),
  },
  {
    type: "kendi_yatirim",
    badge: "KENDİ YATIRIM",
    desc: (
      <>Arsa bize ait, işveren yok. Gelir <strong>daire/dükkan satışından</strong> gelir, kâr satış−maliyet farkıdır.</>
    ),
  },
  {
    type: "kat_karsiligi",
    badge: "KAT KARŞILIĞI",
    desc: (
      <>Arsa sahibinin arsasına inşaat, karşılığında <strong>ünite payı</strong> alırız. Arsa maliyeti yok, kendi payımızı satarız.</>
    ),
  },
];

export function TypeLegend({ counts }: { counts: ProjectCounts }) {
  return (
    <div className="prj-legend">
      {LEGEND.map((item) => (
        <section key={item.type} className={`prj-legend__card prj-legend__card--${item.type}`}>
          <div className="prj-legend__head">
            <span className="prj-type-badge prj-type-badge--legend">{item.badge}</span>
            <span className="prj-legend__count">{counts[item.type]} proje</span>
          </div>
          <p className="prj-legend__desc">{item.desc}</p>
        </section>
      ))}
    </div>
  );
}
