"use client";

import { useSyncExternalStore } from "react";

import { Alert, Button } from "@/components/ui";
import { STALE_BUILD_MESSAGE, isStaleBuild, subscribeStaleBuild } from "@/lib/api/app-build";
import "./stale-build-banner.css";

export interface StaleBuildBannerProps {
  /** Varsayılan: `window.location.reload()` — testte enjekte edilir. */
  onReload?: () => void;
}

function reloadPage(): void {
  window.location.reload();
}

/** SSR'da sürüm farkı bilinemez — bant yalnız istemcide açılır. */
function serverSnapshot(): boolean {
  return false;
}

/**
 * PLN-F2.0 — "eski sürüm" bandı (kabuk, üst çubuğun altı).
 *
 * Mockup'ı YOKTUR: uygulama içi uyarı bandı emsali (`@/components/ui` Alert
 * `warning` varyantı — `PayrollSgkView` K3 bantları) aynen kullanılır, yeni
 * renk/glif yok. Bant yalnız uyumsuzlukta basılır; aksi hâlde DOM'a hiçbir şey
 * girmez (mevcut görsel kareler değişmez).
 */
export function StaleBuildBanner({ onReload = reloadPage }: StaleBuildBannerProps) {
  const isStale = useSyncExternalStore(subscribeStaleBuild, isStaleBuild, serverSnapshot);
  if (!isStale) return null;

  return (
    <Alert variant="warning" className="stale-build-banner" data-testid="stale-build-banner">
      <span className="stale-build-banner__row">
        <span>{STALE_BUILD_MESSAGE}</span>
        <Button variant="secondary" size="sm" onClick={onReload}>
          Yenile
        </Button>
      </span>
    </Alert>
  );
}
