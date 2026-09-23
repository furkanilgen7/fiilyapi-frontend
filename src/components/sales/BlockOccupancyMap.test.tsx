import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlockOccupancyMap } from "./BlockOccupancyMap";

describe("BlockOccupancyMap — yükleniyor hâli (no 234)", () => {
  it("blocks undefined ve notice yokken 'yükleniyor' mesajı basar", () => {
    render(<BlockOccupancyMap blocks={undefined} notice={undefined} />);
    expect(screen.getByText("Blok haritası yükleniyor…")).toBeInTheDocument();
  });

  it("notice varken yükleniyor mesajı basmaz, notice basılır", () => {
    render(<BlockOccupancyMap blocks={undefined} notice="Yetki yok." />);
    expect(screen.getByTestId("satis-harita-notu")).toHaveTextContent("Yetki yok.");
    expect(screen.queryByText("Blok haritası yükleniyor…")).not.toBeInTheDocument();
  });

  it("blocks boş dizi olunca 'tanımlı blok yok' basar (yükleniyor değil)", () => {
    render(<BlockOccupancyMap blocks={[]} notice={undefined} />);
    expect(screen.getByTestId("satis-harita-bos")).toBeInTheDocument();
    expect(screen.queryByText("Blok haritası yükleniyor…")).not.toBeInTheDocument();
  });
});
