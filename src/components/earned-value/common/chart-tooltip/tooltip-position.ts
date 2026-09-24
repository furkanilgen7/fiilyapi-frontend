/**
 * PLN-F1.2 · Grafik ipucunun SAF konum hesabı.
 *
 * Mockup'lar ipucunu elle çevirir: Panel.dc.html:570 `tx + 160 > 744 ?
 * tx - 160 : tx + 12` (sağa sığmıyorsa sola) ve dikeyde
 * `Math.min(140, Math.max(16, ay - 20))` (kabın içine kıstır). Bu modül aynı
 * iki kuralı genelleştirir: ANA eksende taşarsa karşı yana ÇEVİR, ÇAPRAZ
 * eksende (ve iki yana da sığmıyorsa ana eksende) kabın içine KISTIR.
 *
 * 🔴 Görsel kapı kuralı (cash-flow-geometry.ts:4-9): çıkan her koordinat
 * `Math.round`lanır — kesirli piksel, turdan tura farklı yuvarlanıp
 * baseline'ı oynatır.
 */

export type TooltipPlacement = "right" | "left" | "top" | "bottom";

/** Noktayla kutu arası (Panel.dc.html:570 `tx + 12`). */
export const TOOLTIP_GAP = 12;
/** Kap kenarına en az bu kadar pay bırakılır. */
export const TOOLTIP_MARGIN = 4;

export interface TooltipPositionInput {
  /** Çapa noktası — kabın sol-üst köşesine göre CSS pikseli. */
  x: number;
  y: number;
  /** İpucu kutusunun ölçülen boyu. */
  width: number;
  height: number;
  /** Kabın (konumlandırma bağlamının) iç boyu. */
  boundsWidth: number;
  boundsHeight: number;
  /** Varsayılan `"right"`. */
  placement?: TooltipPlacement;
}

export interface TooltipPosition {
  left: number;
  top: number;
  /** Çevirme sonrası GERÇEKLEŞEN yerleşim. */
  placement: TooltipPlacement;
}

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = {
  right: "left",
  left: "right",
  top: "bottom",
  bottom: "top",
};

function rawPosition(input: TooltipPositionInput, placement: TooltipPlacement) {
  const { x, y, width, height } = input;
  switch (placement) {
    case "right":
      return { left: x + TOOLTIP_GAP, top: y - height / 2 };
    case "left":
      return { left: x - TOOLTIP_GAP - width, top: y - height / 2 };
    case "top":
      return { left: x - width / 2, top: y - TOOLTIP_GAP - height };
    case "bottom":
      return { left: x - width / 2, top: y + TOOLTIP_GAP };
  }
}

function overflowsMainAxis(
  input: TooltipPositionInput,
  placement: TooltipPlacement,
  pos: { left: number; top: number },
): boolean {
  const horizontal = placement === "left" || placement === "right";
  const start = horizontal ? pos.left : pos.top;
  const size = horizontal ? input.width : input.height;
  const limit = horizontal ? input.boundsWidth : input.boundsHeight;
  return start < TOOLTIP_MARGIN || start + size > limit - TOOLTIP_MARGIN;
}

function clamp(value: number, size: number, limit: number): number {
  const max = limit - size - TOOLTIP_MARGIN;
  if (max < TOOLTIP_MARGIN) return TOOLTIP_MARGIN;
  return Math.min(Math.max(value, TOOLTIP_MARGIN), max);
}

export function placeTooltip(input: TooltipPositionInput): TooltipPosition {
  const preferred = input.placement ?? "right";
  let placement = preferred;
  let pos = rawPosition(input, preferred);

  if (overflowsMainAxis(input, preferred, pos)) {
    const flipped = OPPOSITE[preferred];
    const flippedPos = rawPosition(input, flipped);
    if (!overflowsMainAxis(input, flipped, flippedPos)) {
      placement = flipped;
      pos = flippedPos;
    }
  }

  return {
    left: Math.round(clamp(pos.left, input.width, input.boundsWidth)),
    top: Math.round(clamp(pos.top, input.height, input.boundsHeight)),
    placement,
  };
}
