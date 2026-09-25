import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeatherStrip, type WeatherStripDay } from "./WeatherStrip";

const DAYS: WeatherStripDay[] = [
  { day: "2026-09-18", condition: "sunny", temp_min_c: "11", temp_max_c: "18", wind_ms: "5" },
  { day: "2026-09-19", condition: "sunny", temp_min_c: "10", temp_max_c: "17", wind_ms: "4.5" },
  { day: "2026-09-20", condition: "partly_cloudy", temp_min_c: "13", temp_max_c: "16", wind_ms: "3.6" },
  { day: "2026-09-21", condition: "windy", temp_min_c: "8", temp_max_c: "15", wind_ms: "12" },
  { day: "2026-09-22", condition: "rainy", temp_min_c: "6", temp_max_c: "14", wind_ms: "9" },
  { day: "2026-09-23", condition: "cloudy", temp_min_c: "8", temp_max_c: "15", wind_ms: "6" },
  { day: "2026-09-24", condition: "partly_cloudy", temp_min_c: "9", temp_max_c: "17", wind_ms: "7" },
];

describe("WeatherStrip — GİR başlık 7 günlük hava (GİR:157-166)", () => {
  it("7 gün basılır, kısa hafta günü etiketiyle", () => {
    render(<WeatherStrip days={DAYS} reportDate="2026-09-24" />);
    expect(screen.getAllByRole("group")[0]).toBeDefined();
    expect(screen.getByText("Per")).toBeInTheDocument(); // 24.09.2026 Perşembe
  });

  it("rüzgâr m/s → km/sa (formatWindKmh, çekirdek)", () => {
    render(<WeatherStrip days={DAYS} reportDate="2026-09-24" />);
    expect(screen.getByText("18 km/sa")).toBeInTheDocument(); // 5 m/s → 18 km/sa
  });

  it("rapor gününden SONRAKİ günler soluk sınıfı taşır", () => {
    const days: WeatherStripDay[] = [
      { day: "2026-09-24", condition: "sunny", temp_min_c: "9", temp_max_c: "17", wind_ms: "7" },
      { day: "2026-09-25", condition: "sunny", temp_min_c: "9", temp_max_c: "17", wind_ms: "7" },
    ];
    const { container } = render(<WeatherStrip days={days} reportDate="2026-09-24" />);
    const cells = container.querySelectorAll(".ev-weather-strip__day");
    expect(cells[0]).not.toHaveClass("ev-weather-strip__day--future");
    expect(cells[1]).toHaveClass("ev-weather-strip__day--future");
  });

  it("rapor günü kendisi 'current' sınıfı taşır", () => {
    const { container } = render(<WeatherStrip days={[DAYS[6]]} reportDate="2026-09-24" />);
    expect(container.querySelector(".ev-weather-strip__day")).toHaveClass("ev-weather-strip__day--current");
  });

  it("sıcaklık yoksa EMPTY_CELL basılır, çökme yok", () => {
    const days: WeatherStripDay[] = [{ day: "2026-09-24", condition: null, temp_min_c: null, temp_max_c: null, wind_ms: null }];
    render(<WeatherStrip days={days} reportDate="2026-09-24" />);
    expect(screen.getAllByText("—")).toHaveLength(2); // sıcaklık + rüzgâr
  });
});
