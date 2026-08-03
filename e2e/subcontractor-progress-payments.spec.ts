import { test, expect, type Page, type Request } from "@playwright/test";

// F-TH T6 · Taşeron Hakedişi fonksiyonel e2e — `e2e/progress-payments.spec.ts`
// deseninin AYNISI. Kapsam (brief §Fonksiyonel e2e): sekme gezinmesi, filtre
// URL state, liste → detay, durum aksiyonları (draft→onaya gönder,
// pending→onayla/reddet, approved→ödendi/geri al), Düzenle giriş noktası,
// sözleşme seçim adımı, form kaydetme + veri-kaybı korkuluğu, şantiye sekmesi.
//
// ⚠️ İKİ TUZAK (brief §⛔): (1) `getByRole("alert")` KULLANILMAZ — Next.js
// route-announcer'ı kendi `role="alert"` düğümünü basar, bunun yerine
// sınıf/test-id kapsamlı assert kullanılır. (2) Mutasyona uğrayan kayıtlar
// görsel spec'lerin kadrajına GİRMEZ — bu dosyanın mutasyona uğrattığı `scpp-6`
// ve `scpp-7`, `e2e/mock-backend.ts`te `hiddenFromLists: true` ile işaretlidir
// (liste/özet uçlarından tamamen dışlanır), `subcontractor-progress-payments-
// visual.spec.ts` vb. bu testin ne zaman/hangi sırada koştuğundan (fullyParallel)
// yapısal olarak bağımsızdır. Okuma-amaçlı testler (A/B/C/G) SABİT `scpp-1..5`
// kayıtlarını KULLANIR ama MUTASYONA UĞRATMAZ.
//
// Zamanlayıcıya dayalı bekleme YOK — her adım `expect(...)`in kendi
// deterministik yeniden denemesiyle bekler.

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("taşeron: sekme gezinmesi (gerçek URL değişimi, geri tuşu)", async ({ page }) => {
  await login(page);

  await page.goto("/hakedisler");
  await expect(page.getByRole("heading", { name: "Hakedişler" })).toBeVisible();
  await page.getByRole("tab", { name: "Taşeron" }).click();
  await expect(page).toHaveURL(/\/hakedisler\/taseron$/);
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/hakedisler$/);
  await expect(page.getByRole("heading", { name: "Hakedişler" })).toBeVisible();
});

test("taşeron: filtreler URL state (yazma, kalıcılık, paylaşılan URL)", async ({ page }) => {
  await login(page);

  // 1) Seçim URL'ye yazılır.
  await page.goto("/hakedisler/taseron");
  await expect(page.getByTestId("thk-kpi-strip")).toBeVisible();
  await page.getByLabel("Durum filtresi").selectOption("paid");
  await expect(page).toHaveURL(/status=paid/);

  // 2) Sayfa yenilenince filtre korunur.
  await page.reload();
  await expect(page.getByLabel("Durum filtresi")).toHaveValue("paid");

  // 3) Paylaşılan URL doğrudan filtreli açılır — yalnız `paid` (scpp-1)
  // görünür, diğer durumlardaki sabit kayıtlar (scpp-2..5) basılmaz.
  await page.goto("/hakedisler/taseron?status=paid");
  await expect(page.getByLabel("Durum filtresi")).toHaveValue("paid");
  await expect(page.getByRole("link", { name: "Aydın Elektrik Taah." }).first()).toBeVisible();
  await expect(page.getByText("Çelik İnşaat Taah.")).toHaveCount(0);
});

test("taşeron: liste → detay geçişi", async ({ page }) => {
  await login(page);

  await page.goto("/hakedisler/taseron");
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi" })).toBeVisible();
  await page
    .getByRole("row", { name: "Aydın Elektrik Taah. — Hakediş #2" })
    .click();
  await expect(page).toHaveURL(/\/hakedisler\/taseron\/scpp-2$/);
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi #2" })).toBeVisible();
});

test("taşeron: sözleşme seçim adımı (bilgi notu, seçim → form)", async ({ page }) => {
  await login(page);

  await page.goto("/hakedisler/taseron/yeni");
  await expect(page.getByRole("heading", { name: "Taşeron Hakediş Oluştur" })).toBeVisible();
  // Kalıcı bilgi notu her zaman basılır.
  await expect(page.getByTestId("th-contract-picker-note")).toBeVisible();

  await page.getByLabel("Taşeron Sözleşmesi").selectOption("sc-1");
  await page.getByRole("button", { name: "Devam Et" }).click();
  await expect(page).toHaveURL(/\/hakedisler\/taseron\/yeni\?contract=sc-1$/);
  await expect(page.getByText("Hakediş Oluştur")).toBeVisible();
});

test("taşeron: sözleşme seçim adımı — boş durum metni", async ({ page }) => {
  await login(page);

  // Boş durum, mock state'i MUTASYONA UĞRATMADAN, yalnız BU sayfa yüküne
  // özel bir ağ yanıtı override'ı ile üretilir (brief §Yasaklar: mock-backend
  // state'i başka testleri etkilemez, deterministik — zamanlayıcı YOK).
  await page.route("**/subcontractor-progress-payments?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, limit: 200, offset: 0 }),
    });
  });

  await page.goto("/hakedisler/taseron/yeni");
  await expect(page.getByTestId("th-contract-picker-empty")).toBeVisible();
});

test("taşeron: form kaydetme + veri kaybı korkuluğu (PUT lines gövdesi)", async ({ page }) => {
  await login(page);

  // `scpp-6` — hiddenFromLists:true, sc-2 (2 sözleşme kalemi: sci-4/sci-5),
  // taze taslak, satırsız. Yalnız BİR miktar doldurulur; PUT gövdesinde İKİ
  // satırın da (dokunulmayan dahil) gittiği doğrulanır — veri-kaybı korkuluğu.
  const linesRequest = page.waitForRequest(
    (req) => req.url().includes("/subcontractor-progress-payments/scpp-6/lines") && req.method() === "PUT",
  );

  await page.goto("/hakedisler/taseron/scpp-6/duzenle");
  await expect(page.getByRole("heading", { name: /Hakediş #2 Düzenle/ })).toBeVisible();

  await page.getByLabel("Duvar Örgü İşleri — miktar").fill("500");
  await page.getByRole("button", { name: "Taslak Kaydet" }).click();

  const request: Request = await linesRequest;
  const body = request.postDataJSON() as { lines: Array<{ contract_item_id: string; quantity: string }> };
  expect(body.lines).toHaveLength(2);
  expect(body.lines.map((l) => l.contract_item_id).sort()).toEqual(["sci-4", "sci-5"]);
  const filledLine = body.lines.find((l) => l.contract_item_id === "sci-4");
  expect(filledLine?.quantity).toBe("500");

  // Kaydetme başarılı: hata bandı basılmaz, listeye dönülür.
  await expect(page).toHaveURL(/\/hakedisler\/taseron$/);
});

test("taşeron: durum aksiyonları (draft→onaya gönder→reddet→onayla→geri al→ödendi) + Düzenle giriş noktası", async ({
  page,
}) => {
  await login(page);

  // `scpp-7` — hiddenFromLists:true, sc-1, taze taslak (2 satır). Bu test
  // kaydı UÇTAN UCA mutasyona uğratır (fullyParallel altında görsel
  // spec'lerin sabit kayıtlarından İZOLE, brief §⛔ tuzak 2).
  await page.goto("/hakedisler/taseron/scpp-7");
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi #5" })).toBeVisible();
  await expect(page.getByText("Taslak", { exact: true })).toBeVisible();

  // Düzenle girişi — yalnız `draft` detayında görünür.
  const editLink = page.getByRole("link", { name: "Düzenle" });
  await expect(editLink).toHaveAttribute("href", "/hakedisler/taseron/scpp-7/duzenle");

  // draft → Onaya Gönder.
  await page.getByRole("button", { name: "Onaya Gönder" }).click();
  await expect(page.getByText("Onay Bekliyor", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveCount(0);

  // pending_approval → Reddet: boş gerekçeyle GÖNDERİLEMEZ.
  await page.getByRole("button", { name: "Reddet" }).click();
  const rejectDialog = page.getByRole("dialog", { name: "Hakedişi Reddet" });
  await expect(rejectDialog).toBeVisible();
  const confirmRejectButton = rejectDialog.getByRole("button", { name: "Reddet" });
  await expect(confirmRejectButton).toBeDisabled();

  // Gerekçe girilince gönderilebilir → draft'a döner, "Revize Gerekli" rozeti.
  await rejectDialog.getByLabel("Gerekçe (zorunlu)").fill("eksik metraj kontrol edilsin");
  await expect(confirmRejectButton).toBeEnabled();
  await confirmRejectButton.click();
  await expect(rejectDialog).toHaveCount(0);
  await expect(page.getByText("Revize Gerekli")).toBeVisible();
  await expect(page.getByTestId("th-detail-rejection-alert")).toContainText("eksik metraj kontrol edilsin");

  // draft → Onaya Gönder (tekrar) → pending_approval → Onayla.
  await page.getByRole("button", { name: "Onaya Gönder" }).click();
  await expect(page.getByText("Onay Bekliyor", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Onaylandı", { exact: true })).toBeVisible();

  // approved → Onayı Geri Al → pending_approval.
  await page.getByRole("button", { name: "Onayı Geri Al" }).click();
  const unapproveDialog = page.getByRole("dialog", { name: "Onayı Geri Al" });
  await expect(unapproveDialog).toBeVisible();
  await unapproveDialog.getByRole("button", { name: "Onayı Geri Al" }).click();
  await expect(unapproveDialog).toHaveCount(0);
  await expect(page.getByText("Onay Bekliyor", { exact: true })).toBeVisible();

  // pending_approval → Onayla → approved → Ödendi İşaretle → paid.
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("Onaylandı", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ödendi İşaretle" }).click();
  await expect(page.getByText("Ödendi", { exact: true })).toBeVisible();
});

test("taşeron: şantiye sekmesi (satır → detay, Tümü → listeye)", async ({ page }) => {
  await login(page);

  await page.goto("/projeler/p-1/santiyeler/s-1/hakedisler");
  await expect(page.getByRole("heading", { name: "A-Blok Şantiyesi — Hakedişler" })).toBeVisible();

  await page
    .getByRole("link", { name: "Aydın Elektrik Taah. — Hakediş #1" })
    .click();
  await expect(page).toHaveURL(/\/hakedisler\/taseron\/scpp-1$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/hakedisler\/p-1\/santiyeler\/s-1\/hakedisler$|\/santiyeler\/s-1\/hakedisler$/);
  await page.getByRole("link", { name: "Tümü →" }).last().click();
  await expect(page).toHaveURL(/\/hakedisler\/taseron$/);
});
