import { test, expect, type Page } from "@playwright/test";

import {
  asistaniAc,
  GECMIS_ROTA_DESENI,
  gecmisiSabitle,
  uzunGecmis,
} from "./asistan-helpers";

/**
 * F-AISOL · `/asistan` DİKEY DÜZEN bekçisi — kullanıcının bildirdiği
 * "bu boşluk ne" kusurunun regresyon kapısı.
 *
 * 🔴 Bu dosyanın hiçbir test başlığında "gorsel" GEÇMEZ: burada kadraj yok,
 * GEOMETRİ ölçülür. Kareler `asistan-visual.spec.ts`te.
 *
 * ## Ölçülen iki kusur
 *
 * 1. **Panel içerik alanını doldurmuyordu.** `.ai-panel`de `height: 100%`
 *    yazıyordu; `.app-content` (shell.css) yalnız `min-height` verdiği için
 *    yüzde yükseklik ÇÖZÜLMÜYOR ve `auto`ya düşüyordu. Ölçüm (1440×900):
 *    panel 630px, içerik kutusu 792px → altında 162px tam genişlikte ölü şerit.
 * 2. **Sol sütunda liste kısayken "Erişilen Veriler" bloğu dibe çivileniyordu.**
 *    `.ai-history__scroll` `flex: 1` idi; boş geçmişte tek satırlık not ile
 *    blok arasında 575px'lik beyaz delik kalıyordu (kullanıcı kararı
 *    2026-09-03: "böyle kalsın, alttaki boşluğu kapat").
 *
 * 🔴 İkisi BAĞLIDIR: 1'i tek başına düzeltmek 2'yi BÜYÜTÜR (sütun uzayınca
 * delik de uzar). Bu yüzden ikisi de burada bekçilenir.
 */

/** Sol sütun kısayken içerik ile blok arasında kabul edilen en büyük açıklık. */
const KABUL_EDILEN_ACIKLIK_PX = 12;

interface Kutu {
  ust: number;
  alt: number;
  yukseklik: number;
}

interface Olcum {
  panel: Kutu;
  /** `.app-content`in İÇERİK kutusunun alt kenarı — panelin dolduracağı sınır. */
  icerikAlaniAlt: number;
  sutun: Kutu;
  ustBlok: Kutu;
  kaydirma: Kutu;
  veriBlogu: Kutu;
  /** Kaydırma alanındaki SON görünür içeriğin (not ya da son kart) alt kenarı. */
  sonIcerikAlt: number;
  kaydirmaIcerik: number;
  kaydirmaGorunen: number;
}

async function olc(page: Page): Promise<Olcum> {
  return page.evaluate(() => {
    const bul = (secici: string): HTMLElement => {
      const el = document.querySelector(secici);
      if (!(el instanceof HTMLElement)) throw new Error(`ölçülemedi: ${secici}`);
      return el;
    };
    const kutu = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        ust: Math.round(r.top),
        alt: Math.round(r.bottom),
        yukseklik: Math.round(r.height),
      };
    };
    const ana = bul("main.app-content");
    const kaydirma = bul(".ai-history__scroll");
    // Kaydırma alanının en alttaki gerçek içeriği: ya boş-hâl notu ya da son
    // sohbet kartı. Delik TAM BURADA açılıyordu; kutuların kendisi bitişikti.
    const icerikler = kaydirma.querySelectorAll(".ai-history__note, .ai-conv");
    const sonIcerik = icerikler[icerikler.length - 1];
    if (!(sonIcerik instanceof HTMLElement)) {
      throw new Error("kaydırma alanında ölçülecek içerik yok");
    }
    return {
      panel: kutu(bul(".ai-panel")),
      icerikAlaniAlt: Math.round(
        ana.getBoundingClientRect().bottom -
          parseFloat(getComputedStyle(ana).paddingBottom),
      ),
      sutun: kutu(bul(".ai-history")),
      ustBlok: kutu(bul(".ai-history__top")),
      kaydirma: kutu(kaydirma),
      veriBlogu: kutu(bul(".ai-history__data")),
      sonIcerikAlt: kutu(sonIcerik).alt,
      kaydirmaIcerik: kaydirma.scrollHeight,
      kaydirmaGorunen: kaydirma.clientHeight,
    };
  });
}

// ---------------------------------------------------------------------------
// 1) Panel, içerik alanını dikey olarak DOLDURUR (kusur 1)
// ---------------------------------------------------------------------------
test("asistan paneli icerik alanini dikey olarak doldurur", async ({ page }) => {
  await asistaniAc(page);

  const o = await olc(page);
  // 🔴 Tek gerçek iddia BU: panelin dibi ile içerik alanının dibi ÇAKIŞIR.
  // Eski hâlde 710 ile 872 idi — aradaki 162px ölü şeriti kullanıcı gördü.
  expect(Math.abs(o.panel.alt - o.icerikAlaniAlt)).toBeLessThanOrEqual(1);
  // Üç sütun da aynı yüksekliğe uzar; sol sütun kısa kalmaz.
  expect(o.sutun.yukseklik).toBe(o.panel.yukseklik);
});

// ---------------------------------------------------------------------------
// 2) Geçmiş BOŞken "Erişilen Veriler" nota YAPIŞIR (kusur 2)
// ---------------------------------------------------------------------------
test("asistan bos gecmiste erisilen veriler blogu nota yapisir", async ({ page }) => {
  await gecmisiSabitle(page, []);
  await asistaniAc(page);
  await expect(page.getByText("Henüz sohbetiniz yok. İlk sorunuzu sorun.")).toBeVisible();

  const o = await olc(page);
  expect(o.veriBlogu.ust - o.sonIcerikAlt).toBeLessThanOrEqual(KABUL_EDILEN_ACIKLIK_PX);
  // 🔴 AYRIMI da bekçile: blok artık sütunun DİBİNE çivili DEĞİL. Yalnız
  // yukarıdaki açıklık iddiası yazılsaydı, eski `flex: 1` hâlinde kutular
  // zaten bitişik olduğu için bekçi hiçbir şey ölçmezdi.
  expect(o.sutun.alt - o.veriBlogu.alt).toBeGreaterThan(100);
});

// ---------------------------------------------------------------------------
// 3) Geçmiş UZUNken blok dibe döner, üst blok ve blok EZİLMEZ
// ---------------------------------------------------------------------------
test("asistan uzun gecmiste sabit bloklar ezilmez ve liste kaydirir", async ({ page }) => {
  await gecmisiSabitle(page, []);
  await asistaniAc(page);
  await expect(page.getByText("Henüz sohbetiniz yok. İlk sorunuzu sorun.")).toBeVisible();
  const kisa = await olc(page);

  // 🔴 Aynı sayfada geçmişi UZUNA çevir: sabit blokların yükseklikleri
  // kendi kısa-hâl ölçümleriyle karşılaştırılır. Sabit piksel yazsaydık,
  // yazı tipi değişimi bekçiyi yalancı kırmızıya düşürürdü.
  await page.unroute(GECMIS_ROTA_DESENI);
  await gecmisiSabitle(page, uzunGecmis(40));
  await page.reload();
  await expect(page.getByText("Uzun geçmiş sohbeti 40")).toBeVisible();
  const uzun = await olc(page);

  expect(uzun.ustBlok.yukseklik).toBe(kisa.ustBlok.yukseklik);
  expect(uzun.veriBlogu.yukseklik).toBe(kisa.veriBlogu.yukseklik);
  // Liste GERÇEKTEN taşıyor ve kaydırma alanı daralıp kaydırıyor.
  expect(uzun.kaydirmaIcerik).toBeGreaterThan(uzun.kaydirmaGorunen);
  // Blok mockup'taki yerine — sütunun dibine — döner.
  expect(Math.abs(uzun.veriBlogu.alt - uzun.sutun.alt)).toBeLessThanOrEqual(1);
});
