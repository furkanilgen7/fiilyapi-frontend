import { Button } from "@/components/ui/button/Button";

/**
 * P92-96 · görünüm kipi segmenti — Hafta / Ay / Sprint.
 *
 * "Ay" ve "Sprint" DEVRE DIŞIdır (spec §5 S2, kullanıcı kararı): bu iki kipin
 * kendi mockup'ları çizilmedi ve ekran İCAT EDİLMEZ. Üst kural gereği öğeler
 * SİLİNMEZ — yerlerinde, görünür gerekçeyle (title + altındaki not) durur.
 */
const DISABLED_REASON = "Bu görünüm henüz tasarlanmadı — yalnız haftalık plan açık";

export function PlanViewModeSwitch() {
  return (
    <div className="plan-view-mode" role="group" aria-label="Görünüm kipi">
      {/* P93 — tek açık kip */}
      <Button
        variant="ghost"
        size="sm"
        className="plan-view-mode__item plan-view-mode__item--active"
        aria-pressed={true}
      >
        Hafta
      </Button>
      {/* P94-95 */}
      <Button
        variant="ghost"
        size="sm"
        className="plan-view-mode__item"
        disabled
        title={DISABLED_REASON}
      >
        Ay
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="plan-view-mode__item"
        disabled
        title={DISABLED_REASON}
      >
        Sprint
      </Button>
    </div>
  );
}

/** Devre dışı kiplerin gerekçesi — `title` görünmez olduğu için metne de basılır. */
export function PlanViewModeNotice() {
  return (
    <p className="plan__notice">
      “Ay” ve “Sprint” görünümleri henüz açılmadı; bu ekran haftalık planı gösterir.
    </p>
  );
}
