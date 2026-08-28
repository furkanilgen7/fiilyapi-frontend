"use client";

import Link from "next/link";

import {
  FINANCIAL_SUB_NAV,
  financialNavItemHref,
} from "./shell/financial-statements-nav-config";

interface FinancialStatementsSegmentsProps {
  /**
   * 🔴 ZORUNLU, VARSAYILANI YOKTUR. Bulunulan ekranın rotasıdır; hangi
   * segmentin CURRENT basılacağını YALNIZ bu ayrıştırır.
   *
   * Varsayılan verilseydi bir çağıran onu atlar, sessizce kökün segmentini
   * basar ve hiçbir birim testi görmezdi (yalnız görsel kapı görürdü) —
   * `ProjectCard`ta bu tuzak bu turda FİİLEN yakalandı.
   */
  readonly currentHref: string;
}

/**
 * E11:66-70 · segment denetimi — ÜÇ mali tablo ekranının ORTAK geçişi.
 *
 * 🔴 KULLANICI KARARI 2026-08-27: drill sidebar KALDIRILDI (global kabuk
 * sidebar'ıyla aynı konum/genişlikteydi ve ana menüyü ÖRTÜYORDU). O sidebar
 * yapraklarda `/bilanco ↔ /nakit-akisi` DOĞRUDAN geçişinin tek taşıyıcısıydı;
 * geçiş buraya taşındı ve artık üç ekranda da basılır.
 *
 * Sekmeler `FINANCIAL_SUB_NAV`ten TÜRER, elle ikinci bir liste YAZILMAZ.
 *
 * 🔴 `aria-current` HİÇ BASILMAZ (K3/K7): kabuk sidebar'ının `Mali Tablolar`
 * girdisi bu üç rotanın hepsinde zaten `aria-current="page"` sürüyor ve
 * ikincisi ekran okuyucuya "iki ayrı sayfadasınız" derdi. CURRENT sinyali
 * SALT GÖRSELdir ve öğe tıklanamaz bir `<span>`e döner.
 */
export function FinancialStatementsSegments({
  currentHref,
}: FinancialStatementsSegmentsProps) {
  return (
    <div className="fs-mt-seg" data-testid="mt-segments">
      {FINANCIAL_SUB_NAV.map((item) => {
        const href = financialNavItemHref(item);
        return href === currentHref ? (
          <span
            key={item.label}
            className="fs-mt-seg__item fs-mt-seg__item--current"
            data-testid="mt-seg-current"
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={item.label}
            href={href}
            className="fs-mt-seg__item"
            data-testid={`mt-seg-${href.split("/").pop()}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
