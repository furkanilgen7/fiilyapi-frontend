import { describe, it, expect } from "vitest";
import { TOOLTIP_GAP, TOOLTIP_MARGIN, placeTooltip } from "./tooltip-position";

// S-eğrisi kabı ölçüsünde bir sınır; ipucu 150×78 (Panel.dc.html:216).
const BOX = { width: 150, height: 78, boundsWidth: 760, boundsHeight: 250 };

describe("placeTooltip — ana eksen", () => {
  it("sağa sığıyorsa noktanın sağında, dikeyde ortalı durur", () => {
    const p = placeTooltip({ ...BOX, x: 300, y: 120 });
    expect(p).toEqual({ left: 300 + TOOLTIP_GAP, top: 120 - 39, placement: "right" });
  });

  it("SAĞ taşma → sola çevrilir (Panel.dc.html:570 `tx + 160 > 744 ? tx - 160`)", () => {
    const p = placeTooltip({ ...BOX, x: 700, y: 120 });
    expect(p.placement).toBe("left");
    expect(p.left).toBe(700 - TOOLTIP_GAP - 150);
    expect(p.left + 150).toBeLessThanOrEqual(760);
  });

  it("SOL taşma → sağa çevrilir", () => {
    const p = placeTooltip({ ...BOX, x: 40, y: 120, placement: "left" });
    expect(p.placement).toBe("right");
    expect(p.left).toBe(40 + TOOLTIP_GAP);
  });

  it("ÜST taşma → alta çevrilir", () => {
    const p = placeTooltip({ ...BOX, x: 300, y: 30, placement: "top" });
    expect(p.placement).toBe("bottom");
    expect(p.top).toBe(30 + TOOLTIP_GAP);
  });

  it("ALT taşma → üste çevrilir", () => {
    const p = placeTooltip({ ...BOX, x: 300, y: 230, placement: "bottom" });
    expect(p.placement).toBe("top");
    expect(p.top).toBe(230 - TOOLTIP_GAP - 78);
  });

  it("iki yana da sığmıyorsa kabın içine kıstırılır", () => {
    const p = placeTooltip({ width: 150, height: 40, boundsWidth: 200, boundsHeight: 100, x: 100, y: 50 });
    expect(p.left).toBeGreaterThanOrEqual(TOOLTIP_MARGIN);
    expect(p.left + 150).toBeLessThanOrEqual(200 - TOOLTIP_MARGIN);
  });
});

describe("placeTooltip — çapraz eksen", () => {
  it("sağ yerleşimde ÜST kenar taşması kıstırılır", () => {
    const p = placeTooltip({ ...BOX, x: 300, y: 10 });
    expect(p.top).toBe(TOOLTIP_MARGIN);
  });

  it("sağ yerleşimde ALT kenar taşması kıstırılır", () => {
    const p = placeTooltip({ ...BOX, x: 300, y: 245 });
    expect(p.top).toBe(250 - 78 - TOOLTIP_MARGIN);
  });

  it("üst yerleşimde SOL kenar taşması kıstırılır", () => {
    const p = placeTooltip({ ...BOX, x: 20, y: 200, placement: "top" });
    expect(p.left).toBe(TOOLTIP_MARGIN);
  });

  it("üst yerleşimde SAĞ kenar taşması kıstırılır", () => {
    const p = placeTooltip({ ...BOX, x: 750, y: 200, placement: "top" });
    expect(p.left).toBe(760 - 150 - TOOLTIP_MARGIN);
  });

  it("kaptan büyük ipucu kenar payına yaslanır (negatif koordinat YOK)", () => {
    const p = placeTooltip({ width: 300, height: 300, boundsWidth: 200, boundsHeight: 100, x: 100, y: 50 });
    expect(p.left).toBe(TOOLTIP_MARGIN);
    expect(p.top).toBe(TOOLTIP_MARGIN);
  });
});

describe("placeTooltip — görsel kapı kuralı", () => {
  it("kesirli girdiden TAM SAYI koordinat çıkar (cash-flow-geometry.ts:4-9)", () => {
    const p = placeTooltip({ width: 123.4, height: 61.7, boundsWidth: 460.5, boundsHeight: 250.2, x: 100.33, y: 120.77 });
    expect(Number.isInteger(p.left)).toBe(true);
    expect(Number.isInteger(p.top)).toBe(true);
  });
});
