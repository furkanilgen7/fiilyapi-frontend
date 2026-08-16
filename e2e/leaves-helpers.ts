import type { Page } from "@playwright/test";

/**
 * F-IZN T6 · İzin taleplerinin görsel kadrajını SABİTLEYEN kanonik yardımcı
 * (`personnel-roster.ts`in `pinRoster`ı ile AYNI desen).
 *
 * ⚠️ NEDEN GEREKLİ: sahte backend'in izin talep tablosu GLOBALDİR ve
 * `fullyParallel` altında `leaves.spec.ts`in yazma akışları (onay · red ·
 * yeni talep) aynı listeyi oynatır. Süzgeç olmasaydı baseline kâh yedi kâh
 * beş satırla üretilirdi — kaçınılmaz görsel CI kırmızısı.
 *
 * Süzgeç KİMLİK tabanlıdır: yalnız OKUMA adası (`lv-1…lv-5`) kalır. Yazma
 * adası (`lv-w1`/`lv-w2`) ve akışın doğurduğu talepler (`lv-new-*`) düşer.
 * `total` de süzülen kümeye göre YENİDEN yazılır — aksi hâlde tablo başlığı
 * (K5) süzülmemiş sayıyı basar ve kadraj yine oynardı.
 *
 * 🛑 KANONİK UYGULAMA TEK YERDEDİR: görsel spec'ler bu gövdeyi KOPYALAMAZ,
 * **import eder** (`prepareFrame`/`pinRoster` emsali).
 */
const READ_ISLAND_ID = /^lv-\d+$/;

export async function pinLeaveRequests(page: Page) {
  await page.route("**/api/backend/leave-requests*", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      items: { id: string }[];
      total: number;
      limit: number;
      offset: number;
    };
    const items = body.items.filter((item) => READ_ISLAND_ID.test(item.id));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...body, items, total: items.length }),
    });
  });
}
