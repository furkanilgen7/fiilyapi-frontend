import { expect, type Page } from "@playwright/test";

/**
 * F-BOR T6/T7 · bordro e2e'lerinin ORTAK yardımcıları.
 *
 * 🛑 KANONİK UYGULAMA TEK YERDEDİR (`personnel-roster.ts` / `visual-scroll.ts`
 * emsali): spec'ler bu gövdeleri KOPYALAMAZ, **import eder**. Kopyalar arasında
 * sessiz kayma, kopyalayanın determinizm garantisini haber vermeden yok eder.
 */

/** Kuruş = tam sayı. Para ASLA kayan noktada karşılaştırılmaz. */
export function toKurus(decimal: string): number {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(decimal.trim());
  if (match === null) throw new Error(`Decimal ayrıştırılamadı: ${decimal}`);
  const magnitude = Number(match[2]) * 100 + Number(`${match[3] ?? ""}00`.slice(0, 2));
  return match[1] === "-" ? -magnitude : magnitude;
}

/**
 * Dönem listesini KADRAJA/TESTE özgü bir alt kümeye süzer.
 *
 * ⚠️ NEDEN GEREKLİ (F-PT `pinRoster` dersinin bordro karşılığı): sahte backend
 * TÜM spec dosyaları arasında PAYLAŞILIR ve `fullyParallel` altında dosya
 * sırası garanti DEĞİLDİR. `/bordro` varsayılan dönemi listenin EN YENİSİDİR;
 * başka bir spec `POST /payroll/periods` ile yeni bir ay açsaydı ya da bir
 * mutasyon testi kadrajdaki ayı oynatsaydı, kare kâh şöyle kâh böyle üretilir.
 *
 * Süzgeç TEK UÇ yanıtını değiştirir, paylaşılan mock DURUMUNA DOKUNMAZ.
 * `total` da süzülen kümeye göre yeniden yazılır — aksi hâlde kırpılma
 * korkuluğu (K6) süzülmeyen sayıyı sayar ve ekranda olmayan bir uyarı basardı.
 */
export async function pinPayrollPeriods(
  page: Page,
  keep: (row: { year: number; month: number }) => boolean,
) {
  await page.route(
    (url) => url.pathname === "/api/backend/payroll/periods",
    async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      // 🔴 TEARDOWN YARIŞI (F-BOLLINK'te CI'da 3 turda yakalandı, 2026-08-17):
      // onay/kaydetme sonrası React Query listeyi YENİDEN ÇEKER. O istek testin
      // son iddiasından SONRA kapıya gelirse, `route.fetch()`in yanıtı sayfa
      // kapatılırken atılır ve `Response has been disposed` handler'ın İÇİNDE
      // patlar → Playwright bunu TESTİN hatası sayar (`bordro.spec.ts:183`
      // K7 turu, "1 failed"). Kusur ürüne ait DEĞİL, sırf test ömrüne aittir:
      // aynı tur bazen yeşil geçer (sıralamaya bağlı), yani gate FLAKY'dir.
      // Kural: kapanış sırasında ölen bir yönlendirme SESSİZ düşer — testin
      // kendi iddiaları zaten bitmiştir; ömür içindeki her istek eskisi gibi
      // süzülür (semantik DEĞİŞMEDİ).
      try {
        const response = await route.fetch();
        const body = (await response.json()) as {
          items: { year: number; month: number }[];
          total: number;
          limit: number;
          offset: number;
        };
        const items = body.items.filter(keep);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...body, items, total: items.length }),
        });
      } catch {
        // Sayfa/context kapandı: yönlendirilecek bir istek kalmadı.
      }
    },
  );
}

/** Bordro ekranlarının ortak giriş akışı. */
export async function loginForPayroll(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}
