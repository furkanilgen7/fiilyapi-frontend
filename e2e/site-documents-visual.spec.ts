import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-BC T5 · Şantiye › Belgeler (ŞB) görsel testi — mockup `Şantiye -
// Belgeler.dc.html`. `site-diary-visual.spec.ts` / `archive-documents-
// visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: p-1/s-1 belge fikstürlerine DOKUNMAZ. Belge yazan spec'ler
// (`document-dialogs.spec.ts`) bilerek İZOLE ŞANTİYE s-2'de yürür ve kendi
// kayıtlarını siler → `fullyParallel` altında baseline yarışı YOKTUR.
//
// ⏱️ TARİH SABİTLEME (zorunlu): kart/satır etiketleri ("Bugün", "Dün") gerçek
// saate bağlıdır ve fikstürler TEMMUZ 2026'dadır; `page.clock.setFixedTime`
// NAVİGASYONDAN ÖNCE kurulur.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.

const DOCUMENTS_URL = "/projeler/p-1/santiyeler/s-1/belgeler";
const FIXED_NOW = "2026-07-17T13:00:00Z";

test("santiye belgeleri ekrani gorsel", async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto(DOCUMENTS_URL);

  // Yüklendi iddiası (WORKFLOW §4): başlık + aktif sekme + dolu klasör paneli +
  // meta satırı basılı ilk kart + üç satırlık "Son Eklenenler".
  //
  // ⚠️ `.first()` ZORUNLU: akış-SSR kopyası (yalnız Linux CI'da) ve aynı belge
  // adının hem kartta hem "Son Eklenenler" satırında geçmesi kapsamsız
  // locator'ı iki elemana çözer.
  await expect(
    page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi — Belgeler" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const panel = page.getByRole("navigation", { name: "Belge klasörleri" });
  await expect(panel.getByRole("link", { name: /Günlük Raporlar/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Hakediş_5_Jul2026\.pdf/ }).first()).toContainText(
    "1,2 MB · Bugün",
  );
  // Kadraj tip ikonlarının çeşidini de taşısın (pdf · dwg · xlsx).
  await expect(page.getByRole("button", { name: /Mimari_Proje_Rev3\.dwg/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Puantaj_Tem2026\.xlsx/ }).first()).toBeVisible();

  // ŞB 137-164 — "Son Eklenenler": üç satır + ŞB'ye ÖZGÜ "İndir" düğmesi
  // (E12'de bu düğme yoktur; iki baseline arasındaki fark budur).
  const recent = page.getByRole("list", { name: "Son eklenen belgeler" });
  await expect(recent.getByRole("listitem")).toHaveCount(3);
  await expect(recent.getByRole("button", { name: "İndir" }).first()).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("santiye-belgeler.png", { fullPage: true });
});
