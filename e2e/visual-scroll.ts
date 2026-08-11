import { expect, type Page } from "@playwright/test";

/**
 * `fullPage` kadrajdan ÖNCE kaydırmayı sıfırlar ve OTURDUĞUNU doğrular
 * (WORKFLOW §4 "GÖRSEL SPEC KURALI" 2. parça).
 *
 * ⚠️ KÖK NEDEN 1 — PENCERE (F-PT/F-PL dersi, run 31220519552): Playwright'ın
 * `.click()`i hedefi gerekirse görünür alana KAYDIRIR; `fullPage` kadraj da
 * yapışkan kabuğu (topbar+sidebar) o ofsette basar → kare kabuğu ~200px kaymış
 * ve içeriğe binmiş yakalar.
 *
 * ⚠️ KÖK NEDEN 2 — ELEMAN KABI + YATAY EKSEN (F-P10 baseline turu, run
 * 31488352619): pencereyi sıfırlamak YETMEZ. Hedef `overflow: auto` bir kabın
 * İÇİNDEYSE (ör. puantaj matrisinin `.ts-table-scroll`ü) tıklama PENCEREYİ
 * DEĞİL O KABI kaydırır, üstelik YATAY eksende. `puantaj-hucre-popover`
 * baseline'ı tam bu yüzden çift-modluydu: bir tur "Tür" sütununu, öbür tur
 * "Toplam" sütununu basıyordu (iki varyant arasında 43k piksel fark).
 * `playwright.config.ts`te eşik ayarı olmadığı için hangi varyant baseline'a
 * girerse öbürü CI'da KIRMIZIDIR — yani görsel CI'ın yeşil geçmesi ŞANSTI.
 *
 * Bu yüzden korkuluk hem pencereyi hem de sayfadaki kaydırılabilir HER kabı,
 * İKİ EKSENDE sıfırlar. Bekleme DURUM tabanlıdır (`expect.poll`) — sabit
 * `waitForTimeout` YASAK. Kaydırılmayan sayfalarda etkisizdir (no-op), o
 * yüzden kadrajı olan her spec güvenle çağırabilir.
 */
export async function settleScrollTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const node of document.querySelectorAll("*")) {
      if (node.scrollLeft !== 0) node.scrollLeft = 0;
      if (node.scrollTop !== 0) node.scrollTop = 0;
    }
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const offsets = [Math.round(window.scrollX), Math.round(window.scrollY)];
        for (const node of document.querySelectorAll("*")) {
          offsets.push(node.scrollLeft, node.scrollTop);
        }
        return offsets.filter((offset) => offset !== 0).length;
      }),
    )
    .toBe(0);
}
