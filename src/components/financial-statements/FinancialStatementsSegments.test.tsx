import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinancialStatementsSegments } from "./FinancialStatementsSegments";

/**
 * E11:66-70 · segment denetimi — ARTIK ÜÇ EKRANIN ORTAK GEÇİŞİDİR.
 *
 * 🔴 Kullanıcı kararı 2026-08-27: drill sidebar KALDIRILDI (ana menüyü
 * örtüyordu). `/bilanco ↔ /nakit-akisi` doğrudan geçişi YALNIZ sidebar'da
 * yaşıyordu; buraya taşındı. Bu dosya o geçişin bekçisidir.
 *
 * 🔴 `currentHref` ZORUNLUDUR — varsayılanı YOKTUR. Varsayılan verilseydi bir
 * çağıran onu atlar, sessizce kökün segmentini basar ve HİÇBİR birim testi
 * görmezdi (yalnız görsel kapı görürdü).
 */
describe("FinancialStatementsSegments — üç ekranın ortak geçişi", () => {
  it("kökte CURRENT `Gelir Tablosu`dur; diğer ikisi GERÇEK bağlantıdır", () => {
    render(<FinancialStatementsSegments currentHref="/mali-tablolar" />);
    const current = screen.getByTestId("mt-seg-current");
    expect(current).toHaveTextContent("Gelir Tablosu");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveClass("fs-mt-seg__item--current");
    // 🔴 KARŞIT KANIT: yanlış olanlar CURRENT DEĞİL.
    expect(screen.getByTestId("mt-seg-bilanco")).toHaveAttribute(
      "href",
      "/mali-tablolar/bilanco",
    );
    expect(screen.getByTestId("mt-seg-nakit-akisi")).toHaveAttribute(
      "href",
      "/mali-tablolar/nakit-akisi",
    );
  });

  it("🔴 `/bilanco`da CURRENT `Bilanço`dur ve diğer İKİSİ bağlantıdır", () => {
    render(
      <FinancialStatementsSegments currentHref="/mali-tablolar/bilanco" />,
    );
    const current = screen.getByTestId("mt-seg-current");
    expect(current).toHaveTextContent("Bilanço");
    expect(current.tagName).not.toBe("A");
    // 🔴 KARŞIT KANIT: `Bilanço` artık bağlantı DEĞİL, ama kardeşleri bağlantı.
    expect(screen.queryByTestId("mt-seg-bilanco")).toBeNull();
    expect(screen.getByTestId("mt-seg-nakit-akisi")).toHaveAttribute(
      "href",
      "/mali-tablolar/nakit-akisi",
    );
    expect(screen.getByTestId("mt-seg-mali-tablolar")).toHaveAttribute(
      "href",
      "/mali-tablolar",
    );
  });

  it("🔴 `/nakit-akisi`da CURRENT `Nakit Akışı`dır ve diğer İKİSİ bağlantıdır", () => {
    render(
      <FinancialStatementsSegments currentHref="/mali-tablolar/nakit-akisi" />,
    );
    const current = screen.getByTestId("mt-seg-current");
    expect(current).toHaveTextContent("Nakit Akışı");
    expect(current.tagName).not.toBe("A");
    expect(screen.queryByTestId("mt-seg-nakit-akisi")).toBeNull();
    expect(screen.getByTestId("mt-seg-bilanco")).toHaveAttribute(
      "href",
      "/mali-tablolar/bilanco",
    );
    expect(screen.getByTestId("mt-seg-mali-tablolar")).toHaveAttribute(
      "href",
      "/mali-tablolar",
    );
  });

  it("🔴 HER YOLDA TAM BİR CURRENT vardır (ne sıfır ne iki)", () => {
    for (const href of [
      "/mali-tablolar",
      "/mali-tablolar/bilanco",
      "/mali-tablolar/nakit-akisi",
    ]) {
      const { container, unmount } = render(
        <FinancialStatementsSegments currentHref={href} />,
      );
      expect(
        container.querySelectorAll(".fs-mt-seg__item--current"),
      ).toHaveLength(1);
      // K7 — segment denetimi `aria-current` SÜRMEZ; onu kabuk sidebar'ı taşır.
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(
        0,
      );
      // Üç sekmenin ÜÇÜ de her yolda basılır (hiçbiri düşmez).
      expect(container.querySelectorAll(".fs-mt-seg__item")).toHaveLength(3);
      unmount();
    }
  });
});
