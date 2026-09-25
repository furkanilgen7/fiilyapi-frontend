/**
 * PLN-F3.3 · Planlama Paneli'nin SAF hâl seçicisi — PanelScreen.tsx bunu
 * çağırıp döneni switch'ler; hâl KARARI burada, hâlin İÇERİĞİ ayrı
 * bileşenlerde (`PanelLoadingSkeleton`, `PanelBaselineEmptyState`,
 * `PanelNoFieldDataState`, `ErrorCard`, `AccessDenied` — `@/components/
 * settings/AccessDenied`, mevcut desen).
 *
 * Sıra (Panel:400-448 hâl varyantları):
 *   1. site      — şantiye henüz çözülmedi (siteId === "") → sorgu AĞA ÇIKMAZ.
 *   2. forbidden — 403.
 *   3. error     — diğer hata.
 *   4. loading   — sorgu sürüyor, veri henüz yok.
 *   5. no-baseline   — `has_baseline === false` (a).
 *   6. no-field-data — `has_baseline && !has_field_data` (b).
 *   7. loaded    — gövde.
 */
export type PanelScreenState =
  | "site"
  | "forbidden"
  | "error"
  | "loading"
  | "no-baseline"
  | "no-field-data"
  | "loaded";

export interface PanelScreenStateInput {
  siteId: string;
  isForbidden: boolean;
  isError: boolean;
  isLoading: boolean;
  hasBaseline: boolean | undefined;
  hasFieldData: boolean | undefined;
}

export function panelScreenState(input: PanelScreenStateInput): PanelScreenState {
  if (input.siteId === "") return "site";
  if (input.isForbidden) return "forbidden";
  if (input.isError) return "error";
  if (input.isLoading) return "loading";
  if (input.hasBaseline === false) return "no-baseline";
  if (input.hasBaseline === true && input.hasFieldData === false) return "no-field-data";
  return "loaded";
}
