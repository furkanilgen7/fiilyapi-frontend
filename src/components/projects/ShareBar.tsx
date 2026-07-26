import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import { formatPercent } from "@/lib/format";

import "./projects.css";

type LandShare = NonNullable<ProjectListItem["land_share"]>;

// Mockup satir 147-150. Unite sayilari (`· 23 ünite`) units modulune bagli — basilmaz (spec §7.4).
export function ShareBar({ share }: { share: LandShare }) {
  return (
    <div className="prj-share">
      <div className="prj-share__ours" style={{ width: `${Number(share.our_share_pct)}%` }}>
        Biz {formatPercent(share.our_share_pct)}
      </div>
      <div className="prj-share__owner" style={{ width: `${Number(share.owner_share_pct)}%` }}>
        Arsa {formatPercent(share.owner_share_pct)}
      </div>
    </div>
  );
}
