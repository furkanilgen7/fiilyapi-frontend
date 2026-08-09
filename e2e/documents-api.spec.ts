import { test, expect, type Page } from "@playwright/test";

// F-BC T1 · Belge Arşivi ALTYAPI e2e'si (ekran DEĞİL — ekranlar T2/T4).
//
// Neden UI'sız: bu dilimde basılan tek şey BFF + hook + mock katmanıdır ve
// buradaki iki davranış jsdom'da KANITLANAMAZ:
//   1. multipart gövdenin BFF'ten backend'e ham geçmesi (gövde JSON'a
//      çevrilirse mock ayrıştırıcı 422 döner),
//   2. indirme yanıtının ikili dal + `Content-Disposition` ile geçmesi.
// İstekler `page.request` ile atılır: giriş sonrası httpOnly oturum çerezi
// aynı bağlamdan taşınır, token URL'e KONMAZ.
//
// 🔒 FİKSTÜR İZOLASYONU (P7/F-PL dersi): mock backend TÜM spec'lerde TEK
// paylaşılan sunucudur. Bu dosya YAZMA akışlarını p-2'de yürütür; p-1'in
// belge fikstürleri (T2/T4 baseline'larının kaynağı) HİÇ değişmez.
const READ_PROJECT = "p-1";
const READ_SITE = "s-1";
const WRITE_PROJECT = "p-2";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

interface DocumentRow {
  id: string;
  filename: string;
  site_id: string | null;
  folder_id: string | null;
  description: string | null;
  size_bytes: number;
}

test.describe("belge arşivi altyapısı (salt-okur)", () => {
  test("klasör listesi: site_id GEÇMEMEK proje düzeyi demektir, 'hepsi' değil", async ({
    page,
  }) => {
    await login(page);

    const projectLevel = await page.request.get(
      `/api/backend/projects/${READ_PROJECT}/document-folders`,
    );
    const siteLevel = await page.request.get(
      `/api/backend/projects/${READ_PROJECT}/document-folders?site_id=${READ_SITE}`,
    );

    expect(projectLevel.status()).toBe(200);
    expect(siteLevel.status()).toBe(200);
    const projectFolders = (await projectLevel.json()).folders as Array<{ site_id: string | null }>;
    const siteFolders = (await siteLevel.json()).folders as Array<{ site_id: string | null }>;

    expect(projectFolders.length).toBeGreaterThan(0);
    expect(siteFolders.length).toBeGreaterThan(0);
    // İki küme AYRIKTIR — proje düzeyi istek şantiye klasörlerini SIZDIRMAZ.
    expect(projectFolders.every((f) => f.site_id === null)).toBe(true);
    expect(siteFolders.every((f) => f.site_id === READ_SITE)).toBe(true);
  });

  test("belge listesi: kapsam ve arama süzgeçleri gerçekten uygulanır", async ({ page }) => {
    await login(page);

    const projectLevel = await page.request.get(
      `/api/backend/documents?project_id=${READ_PROJECT}`,
    );
    const siteLevel = await page.request.get(
      `/api/backend/documents?project_id=${READ_PROJECT}&site_id=${READ_SITE}`,
    );
    const searched = await page.request.get(
      `/api/backend/documents?project_id=${READ_PROJECT}&site_id=${READ_SITE}&q=ruhsat`,
    );

    const projectDocs = (await projectLevel.json()).documents as DocumentRow[];
    const siteDocs = (await siteLevel.json()).documents as DocumentRow[];
    const searchDocs = (await searched.json()).documents as DocumentRow[];

    expect(projectDocs.every((d) => d.site_id === null)).toBe(true);
    expect(siteDocs.every((d) => d.site_id === READ_SITE)).toBe(true);
    expect(searchDocs.length).toBeGreaterThan(0);
    expect(searchDocs.length).toBeLessThan(siteDocs.length);
    expect(searchDocs.every((d) => /ruhsat/i.test(d.filename))).toBe(true);
  });

  test("klasör süzgeci: yalnız o klasörün belgeleri döner", async ({ page }) => {
    await login(page);
    const response = await page.request.get(
      `/api/backend/documents?project_id=${READ_PROJECT}&site_id=${READ_SITE}&folder_id=df-s1-6`,
    );
    const docs = (await response.json()).documents as DocumentRow[];
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d.folder_id === "df-s1-6")).toBe(true);
  });

  test("indirme: ikili gövde ve dosya adı başlığı korunur", async ({ page }) => {
    await login(page);
    const response = await page.request.get("/api/backend/documents/doc-s1-1/download");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(response.headers()["content-disposition"]).toContain("Hakedi");
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  });

  test("indirme: olmayan belge JSON dalından 404 döner", async ({ page }) => {
    await login(page);
    const response = await page.request.get("/api/backend/documents/yok/download");
    expect(response.status()).toBe(404);
    expect((await response.json()).detail).toBe("Belge bulunamadı.");
  });
});

// YAZMA akışları SERİ: hepsi p-2'yi değiştirir.
test.describe("belge arşivi altyapısı (yazma, p-2)", () => {
  test.describe.configure({ mode: "serial" });

  test("klasör oluşturma; aynı ad ikinci kez 409 alır", async ({ page }) => {
    await login(page);
    const name = `E2E Klasör ${Date.now()}`;

    const created = await page.request.post(
      `/api/backend/projects/${WRITE_PROJECT}/document-folders`,
      { data: { name } },
    );
    expect(created.status()).toBe(201);
    const folder = await created.json();
    expect(folder.name).toBe(name);
    expect(folder.site_id).toBeNull();

    const clash = await page.request.post(
      `/api/backend/projects/${WRITE_PROJECT}/document-folders`,
      { data: { name } },
    );
    expect(clash.status()).toBe(409);
    expect((await clash.json()).detail).toBe("Bu adda bir klasör zaten var.");
  });

  /**
   * ASIL KAPI: multipart gövde BFF'ten ham geçmezse mock ayrıştırıcı dosyayı
   * bulamaz ve 422 döner. Yani bu test yeşilse gövde JSON'a ÇEVRİLMEMİŞTİR.
   */
  test("multipart yükleme uçtan uca çalışır ve listeye düşer", async ({ page }) => {
    await login(page);
    const filename = `e2e-yukleme-${Date.now()}.pdf`;

    const uploaded = await page.request.post("/api/backend/documents", {
      multipart: {
        project_id: WRITE_PROJECT,
        description: "E2E açıklaması",
        file: {
          name: filename,
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4 e2e"),
        },
      },
    });

    expect(uploaded.status()).toBe(201);
    const created = (await uploaded.json()) as DocumentRow;
    expect(created.filename).toBe(filename);
    expect(created.description).toBe("E2E açıklaması");
    expect(created.size_bytes).toBeGreaterThan(0);

    const listed = await page.request.get(`/api/backend/documents?project_id=${WRITE_PROJECT}`);
    const docs = (await listed.json()).documents as DocumentRow[];
    expect(docs.map((d) => d.filename)).toContain(filename);

    // Temizlik: DELETE ucu API'den kullanılabilir (düğme BASILMAZ, spec §4).
    const removed = await page.request.delete(`/api/backend/documents/${created.id}`);
    expect(removed.status()).toBe(204);
  });

  test("kabul edilmeyen uzantı 422, boyut aşımı 413 döner", async ({ page }) => {
    await login(page);

    const badExtension = await page.request.post("/api/backend/documents", {
      multipart: {
        project_id: WRITE_PROJECT,
        file: { name: "zararli.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") },
      },
    });
    expect(badExtension.status()).toBe(422);
    expect((await badExtension.json()).detail).toBe("Bu dosya türü kabul edilmiyor.");

    const tooLarge = await page.request.post("/api/backend/documents", {
      multipart: {
        project_id: WRITE_PROJECT,
        file: {
          name: "buyuk.pdf",
          mimeType: "application/pdf",
          // Mock sınırı 2 MB (bkz. mock-backend.ts `DOCUMENT_MAX_BYTES`).
          buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 0x41),
        },
      },
    });
    expect(tooLarge.status()).toBe(413);
    expect((await tooLarge.json()).detail).toBe("Dosya boyutu sınırı aşıldı.");
  });
});
