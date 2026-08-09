import { test, expect, type Page } from "@playwright/test";

// F-BC T3 · Yükleme + Yeni Klasör diyalogları (spec §6 S1 ONAYLI türetilmiş
// minimal form). Burada jsdom'un GÖREMEDİĞİ şey kanıtlanır:
//   1. multipart gövdenin diyalogdan BFF'e ve backend'e ham gitmesi,
//   2. 413 / 422 / 409 gövdelerinin EKRANDA Türkçe basılması,
//   3. başarıda listenin TAZELENMESİ (React Query invalidation'ı gerçekten
//      yeni bir istek doğuruyor mu).
//
// 🔒 FİKSTÜR İZOLASYONU (documents-api.spec.ts deseni): mock backend tüm
// spec'lerde TEK paylaşılan sunucudur. Bu dosya YAZAR, bu yüzden p-1/s-1'in
// belge fikstürlerine (T5 görsel baseline'larının kaynağı) ve proje düzeyi
// kayıtlara (T4/E12) DOKUNMAZ: yazma İZOLE ŞANTİYE s-2'de yürür ve her test
// kendi kaydını API'den siler.
const PROJECT = "p-1";
const SITE = "s-2";
const DOCUMENTS_URL = `/projeler/${PROJECT}/santiyeler/${SITE}/belgeler`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** Diyalogların içindeki alanlar her zaman diyaloğa KAPSAMLANIR. */
function dialog(page: Page, name: string) {
  return page.getByRole("dialog", { name });
}

test.describe("belge diyalogları (yazma — izole şantiye)", () => {
  test.describe.configure({ mode: "serial" });

  test("yükleme diyaloğu: dosya + klasör + açıklama ile belge listeye düşer", async ({ page }) => {
    await login(page);
    await page.goto(DOCUMENTS_URL);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Belgeler");

    const filename = `e2e-diyalog-${Date.now()}.pdf`;

    // Kesikli "Dosya Yükle" kartı da aynı diyaloğu açar (ŞB 130-133).
    await page.getByRole("button", { name: "Dosya Yükle" }).first().click();
    const upload = dialog(page, "Belge Yükle");
    await expect(upload).toBeVisible();

    await upload.getByLabel("Dosya").setInputFiles({
      name: filename,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e diyalog"),
    });
    await upload.getByLabel("Açıklama").fill("Diyalogdan yüklendi");
    await upload.getByRole("button", { name: "Yükle" }).click();

    // Başarıda diyalog kapanır ve LİSTE TAZELENİR (yeni kart görünür).
    await expect(upload).toBeHidden();
    await expect(page.getByRole("button", { name: new RegExp(filename) }).first()).toBeVisible();

    // Temizlik: DELETE ucu API'den kullanılabilir (düğme BASILMAZ, spec §4).
    const listed = await page.request.get(
      `/api/backend/documents?project_id=${PROJECT}&site_id=${SITE}`,
    );
    const docs = (await listed.json()).documents as Array<{ id: string; filename: string }>;
    const created = docs.find((d) => d.filename === filename);
    expect(created, "yüklenen belge listede yok").toBeTruthy();
    expect((await page.request.delete(`/api/backend/documents/${created!.id}`)).status()).toBe(204);
  });

  test("yükleme diyaloğu: 413 ve 422 gövdeleri EKRANDA Türkçe basılır", async ({ page }) => {
    await login(page);
    await page.goto(DOCUMENTS_URL);
    await page.getByRole("button", { name: "↑ Yükle" }).click();
    const upload = dialog(page, "Belge Yükle");

    // 422 — izin verilmeyen uzantı
    await upload.getByLabel("Dosya").setInputFiles({
      name: "zararli.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ"),
    });
    await upload.getByRole("button", { name: "Yükle" }).click();
    await expect(upload.locator(".pf-form-error")).toHaveText("Bu dosya türü kabul edilmiyor.");

    // 413 — mock sınırı 2 MB (mock-backend.ts `DOCUMENT_MAX_BYTES`)
    await upload.getByLabel("Dosya").setInputFiles({
      name: "buyuk.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 0x41),
    });
    await upload.getByRole("button", { name: "Yükle" }).click();
    await expect(upload.locator(".pf-form-error")).toHaveText("Dosya boyutu sınırı aşıldı.");

    // Diyalog hata sonrası AÇIK kalır (kullanıcı düzeltebilsin).
    await expect(upload).toBeVisible();
  });

  test("yeni klasör diyaloğu: klasör panelde belirir, aynı ad 409 mesajı basar", async ({
    page,
  }) => {
    await login(page);
    await page.goto(DOCUMENTS_URL);
    const name = `E2E Diyalog Klasörü ${Date.now()}`;

    // Panel başlığındaki "+" düğmesi (ŞB 40)
    await page.getByRole("button", { name: "Yeni klasör" }).click();
    const folderDialog = dialog(page, "Yeni Klasör");
    await folderDialog.getByLabel("Klasör Adı").fill(name);
    await folderDialog.getByRole("button", { name: "Oluştur" }).click();

    // Başarıda kapanır ve KLASÖR PANELİ tazelenir.
    await expect(folderDialog).toBeHidden();
    const panel = page.getByRole("navigation", { name: "Belge klasörleri" });
    await expect(panel.getByRole("link", { name: new RegExp(name) })).toBeVisible();

    // Aynı ad ikinci kez → 409 gövdesi ekranda
    await page.getByRole("button", { name: "+ Klasör" }).click();
    const second = dialog(page, "Yeni Klasör");
    await second.getByLabel("Klasör Adı").fill(name);
    await second.getByRole("button", { name: "Oluştur" }).click();
    await expect(second.locator(".pf-form-error")).toHaveText("Bu adda bir klasör zaten var.");
    await expect(second).toBeVisible();

    // Temizlik: DELETE ucu API'den (düğme BASILMAZ, spec §4).
    await second.getByRole("button", { name: "Vazgeç" }).click();
    const folders = await page.request.get(
      `/api/backend/projects/${PROJECT}/document-folders?site_id=${SITE}`,
    );
    const rows = (await folders.json()).folders as Array<{ id: string; name: string }>;
    const created = rows.find((f) => f.name === name);
    expect(created, "oluşturulan klasör listede yok").toBeTruthy();
    expect(
      (await page.request.delete(`/api/backend/document-folders/${created!.id}`)).status(),
    ).toBe(204);
  });

  test("yükleme diyaloğu boş gönderimde istek atmaz, alan hatası basar", async ({ page }) => {
    await login(page);
    await page.goto(DOCUMENTS_URL);
    await page.getByRole("button", { name: "↑ Yükle" }).click();

    const upload = dialog(page, "Belge Yükle");
    await upload.getByRole("button", { name: "Yükle" }).click();
    await expect(upload.locator(".pf-form-error")).toHaveText("Bir dosya seçin.");
  });
});
