import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { UpcomingCollectionsCard } from "./UpcomingCollectionsCard";
import type { UpcomingCollection } from "@/lib/api/hooks/useSalesSummary";

/**
 * F-P8 · SY 217-234. Kanıtlanan ilke, kardeş bileşen `SalesKpiStrip`inkiyle
 * AYNIDIR: veri yokken SAHTE bir olumlu iddia basılmaz. "Önümüzdeki 30 günde
 * vadesi gelen taksit yok" KESİN bir cümledir; yalnız sunucu GERÇEKTEN boş
 * dizi verdiğinde doğrudur. Yükleniyor/hata hâlinde basılırsa gecikmiş
 * tahsilatları gizleyen bir yanlış-negatif üretir.
 */

const EMPTY_CLAIM = "Önümüzdeki 30 günde vadesi gelen taksit yok.";

function row(): UpcomingCollection {
  return {
    installment_id: "i-1",
    unit_label: "A Blok · 3",
    customer_name: "Ayşe Yılmaz",
    label: "3. Taksit",
    due_date: "2026-09-20",
    remaining_amount: "120000.00",
    is_overdue: false,
    days_overdue: 0,
    late_fee_amount: "0.00",
  } as unknown as UpcomingCollection;
}

describe("UpcomingCollectionsCard — 'boş' ile 'veri yok' AYRI hâllerdir", () => {
  it("sunucu GERÇEKTEN boş dizi verdiğinde boş-durum cümlesi basılır", () => {
    render(<UpcomingCollectionsCard items={[]} isLoading={false} isError={false} />);
    expect(screen.getByTestId("satis-yaklasan-bos")).toHaveTextContent(EMPTY_CLAIM);
  });

  it("YÜKLENİRKEN 'taksit yok' iddiası BASILMAZ", () => {
    render(<UpcomingCollectionsCard items={undefined} isLoading isError={false} />);
    const box = screen.getByTestId("satis-yaklasan-bos");
    expect(box).not.toHaveTextContent(EMPTY_CLAIM);
    expect(box).toHaveTextContent(/yükleniyor/i);
  });

  it("HATA hâlinde 'taksit yok' iddiası BASILMAZ, sunucunun cümlesi basılır", () => {
    render(
      <UpcomingCollectionsCard
        items={undefined}
        isLoading={false}
        isError
        errorMessage="Özet yüklenemedi."
      />,
    );
    const box = screen.getByTestId("satis-yaklasan-bos");
    expect(box).not.toHaveTextContent(EMPTY_CLAIM);
    expect(box).toHaveTextContent("Özet yüklenemedi.");
  });

  it("bayrak yokken bile `items` undefined ise boş-durum cümlesi BASILMAZ", () => {
    render(<UpcomingCollectionsCard items={undefined} isLoading={false} isError={false} />);
    expect(screen.getByTestId("satis-yaklasan-bos")).not.toHaveTextContent(EMPTY_CLAIM);
  });

  it("satır varken liste basılır (boş-durum kutusu yok)", () => {
    render(<UpcomingCollectionsCard items={[row()]} isLoading={false} isError={false} />);
    expect(screen.queryByTestId("satis-yaklasan-bos")).not.toBeInTheDocument();
    expect(screen.getByTestId("satis-yaklasan-i-1")).toHaveTextContent("Ayşe Yılmaz");
  });
});
