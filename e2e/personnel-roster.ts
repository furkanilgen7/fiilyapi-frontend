import type { Page } from "@playwright/test";

/**
 * Personel kartoteksini görsel kadrajlar için SABİTLEYEN KANONİK yardımcı.
 *
 * ⚠️ NEDEN GEREKLİ (F-PT ilk baseline turunda fiilen yakalandı, run
 * 31219400575): personel kartoteksi (`GET /personnel`) mock backend'de
 * GLOBALDİR — ne döneme ne şantiyeye bağlıdır. Başka bir spec'in POST ettiği
 * personel (ör. `personnel-form.spec.ts`in "Zeki Karaca"sı) kadraja SIZAR ve
 * `fullyParallel` altında dosya sırası garanti olmadığı için baseline kâh
 * sızıntılı kâh sızıntısız üretilir — kaçınılmaz görsel CI kırmızısı.
 *
 * Çözüm: TEK UÇ yanıtı süzülür, paylaşılan mock DURUMUNA DOKUNULMAZ
 * (`timesheet.spec.ts`in `/api/auth/me` deseninin aynısı). Böylece kadraj,
 * başka spec'lerin ne zaman/hangi sırada koştuğundan YAPISAL olarak
 * bağımsızdır. Süzgeç KİMLİK tabanlıdır, ad tabanlı DEĞİL: ileride başka bir
 * spec farklı bir ad POST etse de kadraj değişmez.
 *
 * `total` de süzülen kümeye göre YENİDEN yazılır — aksi hâlde ekrandaki
 * "Toplam Personel" KPI'ı ve sayfalama özeti sızıntıyı sayardı (piksel farkı).
 *
 * 🛑 KANONİK UYGULAMA TEK YERDEDİR (F-PT2 final review, `visual-scroll.ts` →
 * `prepareFrame` emsali): görsel spec'ler bu gövdeyi KOPYALAMAZ, **import
 * eder**. Kopyalar arasında sessiz kayma, kopyalayanın determinizm
 * garantisini haber vermeden yok eder.
 */
export async function pinRoster(page: Page) {
  await page.route("**/api/backend/personnel*", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      items: { id: string }[];
      total: number;
      limit: number;
      offset: number;
    };
    const items = body.items.filter((item) => !item.id.startsWith("per-new-"));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...body, items, total: items.length }),
    });
  });
}
