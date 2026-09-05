import { expect, type Page } from "@playwright/test";

import type { AiConversationRead } from "@/lib/api/hooks/useAiConversations";

/**
 * AI-CHAT-2 · `/asistan` görsel kadrajlarının ortak hazırlığı.
 *
 * 🔴 SAAT DONDURULUR. Panel sohbet kartlarını "Bugün / Bu Hafta / Geçen Hafta"
 * gruplarına **bugüne göre** yerleştirir; saat donmazsa aynı baseline yarın
 * farklı başlıklar altında çizilir ve kare her gün kırmızı olur. Fikstür
 * tarihleri `mock-backend.ts::AI_CONVERSATION_FIXTURES` ile birlikte seçildi.
 */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Fikstürün en yeni sohbeti 31 Tem 06:42Z; bu an onu "Bugün"e düşürür.
 *
 * 🔴 AI-BAĞLAM · AY SINIRI ÖLÇÜLDÜ. Damga AYIN SON GÜNÜdür ve bağlam paneli
 * artık `currentPeriod(simdi)`den bir AY ADI türetiyor ("Temmuz 2026"), yani
 * kadraj bu damganın hangi aya düştüğüne BAĞLI. F-ZAMAN kanonu damganın ayın
 * ORTASINDA olmasını ister; damga BİLEREK taşınmadı ve sebebi ölçüldü:
 *   · Ofsetsiz tarih-saat metni YEREL saat sayılır (ES spec). Damgayı Node
 *     çözer, tarayıcı basar ve İKİSİ DE AYNI MAKİNEDEDİR — `playwright.config.ts`
 *     `timezoneId` İLAN ETMEZ (ölçüldü), yani tarayıcı koşucunun saat dilimini
 *     miras alır ve iki taraf arasındaki kayma TAM SIFIRDIR. Yerel duvar saati
 *     her iki ortamda da 31 Tem 12:00 → Temmuz.
 *   · Damgayı ayın ortasına çekmek, fikstürün 31 Tem tarihli sohbetlerini
 *     GELECEĞE düşürür ve sol sütunun "Bugün / Bu Hafta" gruplaması bozulur —
 *     yani altı karenin altısı da başka bir sebeple oynardı.
 * Kalan sınır KAPATILMADI ama GÖRÜNÜR: `ai-baglam-donem` iddiası ayı TAM
 * METİNLE bekler; bir gün koşucu ile tarayıcının saat dilimi ayrışırsa test
 * KIRMIZI olur ve damga yeniden karara bağlanır — sessizce kaymaz.
 */
export const ASISTAN_TIME = new Date("2026-07-31T12:00:00");

export const ASISTAN_URL = "/asistan";

export async function loginAt(page: Page, fixedTime: Date) {
  await page.clock.setFixedTime(fixedTime);
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * `POST /api/ai/chat` için **sabit** bir SSE yanıtı kurar.
 *
 * 🔴 NEDEN `page.route`, NEDEN `mock-backend.ts` DEĞİL:
 *   1. Akış ucu catch-all BFF'ten GEÇMEZ (ayrı rota); sahte backend'e eklemek
 *      onu Next tarafındaki `route.ts`in arkasına koyardı ve boru bağlama
 *      davranışı ölçülmezdi.
 *   2. 🔴🔴 KANON: **RETRY PAYLAŞILAN FİKSTÜRÜ BOZAR.** `mock-backend.ts`
 *      globalSetup üzerinden TEK paylaşımlı süreçte koşar ve durumu SIFIRLAYAN
 *      hiçbir ucu yoktur. `page.route` **sayfaya özeldir**: bu spec hiçbir
 *      paylaşılan duruma dokunmaz, dolayısıyla retry'da da aynı kareyi üretir
 *      ve paralel koşan öbür işçiyi etkilemez.
 *
 * 🔴 Kareler backend'in `stream.py::sse_kodla` çıktısının BİREBİR biçimidir
 * (`event: <ad>\\ndata: <tek satır JSON>\\n\\n`) ve blok gövdeleri
 * `blocks.py`teki alan adlarını taşır. Biçim ayrışırsa istemci ayrıştırıcısı
 * sessizce hiçbir kare üretmez — bu yüzden aşağıdaki iddia (kartın GÖRÜNMESİ)
 * aynı zamanda biçimin de bekçisidir.
 */
export const SABIT_SSE = [
  ": fiil-ai akis acildi\n\n",
  'event: arac_basladi\ndata: {"cagri_id":"c1","arac_adi":"gosterge_ozeti"}\n\n',
  'event: arac_sonuc\ndata: {"cagri_id":"c1","arac_adi":"gosterge_ozeti","hal":"Ok","mesaj":"1 kayıt getirildi.","satir_sayisi":1}\n\n',
  'event: metin\ndata: {"metin":"Temmuz 2026 dönemi için A-Blok Şantiyesi hakediş dağılımı:"}\n\n',
  'event: yapisal_blok\ndata: {"cagri_id":"c1","arac_adi":"gosterge_ozeti","bloklar":[' +
    '{"tip":"metrik","baslik":"İşveren Hakedişi","deger_metni":"₺2.100.000","ton":"bilgi","alt_metin":"Hakediş #5 · onay bekliyor","alt_ton":"uyari"},' +
    '{"tip":"metrik","baslik":"Taşeron Ödemeleri","deger_metni":"₺1.160.000","ton":"uyari","alt_metin":"4 taşeron · 2\u2019si bekliyor","alt_ton":null},' +
    '{"tip":"oran_bari","baslik":"Brüt Kâr","deger_metni":"₺940.000","yuzde_metni":"%44,8","yuzde_alt_etiketi":"marj","ton":"olumlu","dilimler":[' +
    '{"etiket":"maliyet","yuzde":55.2,"ton":"uyari","alt_etiket":"Taşeron maliyeti %55,2"},' +
    '{"etiket":"kar","yuzde":44.8,"ton":"olumlu","alt_etiket":"Kâr %44,8"}]},' +
    '{"tip":"uyari","metin":"Akın İnşaat #47 ve Artı Sıhhi #14 hakedişleri onaylanmadı — toplam ₺1.720.000. Nakit akışında 20 Temmuz\u2019da sıkışma riski var.","ton":"uyari","vurgular":["Akın İnşaat #47","Artı Sıhhi #14"]},' +
    '{"tip":"varlik_listesi","baslik":"Kritik seviyedeki malzemeler","kalemler":[' +
    '{"ad":"Nervürlü Demir Ø12","alt_metin":"2,4 / 15 Ton · Akın İnşaat kullanıyor","doluluk_yuzde":16,"ton":"kritik","rozet_metni":"3 gün","baglanti":{"etiket":"Şantiye Stok","ekran":"stok","kimlik":null,"birincil":false}},' +
    '{"ad":"PP-R Boru 32mm","alt_metin":"120 / 200 m · Kardeş Su kullanıyor","doluluk_yuzde":60,"ton":"uyari","rozet_metni":"5 gün","baglanti":null}]},' +
    '{"tip":"ozet","metin":"Üçü için toplam sipariş tutarı yaklaşık ₺428.500.","vurgular":["₺428.500"]},' +
    '{"tip":"kaynak","kalemler":[' +
    '{"etiket":"Hakediş Kayıtları","ekran":"hakedisler","kimlik":null,"birincil":false},' +
    '{"etiket":"Nakit Akışı","ekran":"hazine","kimlik":null,"birincil":false},' +
    '{"etiket":"Şantiye Stok","ekran":"stok","kimlik":null,"birincil":false}]},' +
    '{"tip":"aksiyon","kalemler":[{"etiket":"Hakedişleri Aç","ekran":"hakedisler","kimlik":null,"birincil":true}]}]}\n\n',
  'event: tur_bitti\ndata: {"sebep":"bitti","kullanim":{"girdi":812,"cikti":244}}\n\n',
].join("");

export async function akisiSabitle(page: Page, govde: string = SABIT_SSE) {
  await page.route("**/api/ai/chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
      },
      body: govde,
    });
  });
}

/**
 * `/asistan`ı açar ve ÜÇ SÜTUNUN da indiğini AYRI AYRI doğrular.
 *
 * 🔴 Sabit `waitForTimeout` YOK: her bekleme durum tabanlıdır. Sağ sütun
 * `/projects`ten, sol sütun `/ai/conversations`tan beslenir; ikisi ayrı
 * kaynaktır ve biri hâlâ yoldayken çekilen kare KENDİ İÇİNDE tutarsız olurdu.
 */
export async function openAsistan(page: Page, fixedTime = ASISTAN_TIME) {
  await asistaniAc(page, fixedTime);
  // Sol sütun: sohbet kartları GERÇEKTEN indi (yükleniyor değil).
  await expect(
    page.getByRole("button", { name: /Güneşkent A-Blok/ }),
  ).toBeVisible();
}

/**
 * Üç sütunu indirir ama sol sütunun İÇERİĞİ hakkında hiçbir şey VARSAYMAZ.
 *
 * 🔴 `openAsistan` paylaşılan fikstürün "Güneşkent A-Blok" kartını bekler;
 * geçmişi `gecmisiSabitle` ile DEĞİŞTİREN bir kadraj o kartı hiç görmez ve
 * orada takılıp kalırdı. Bekleme yine DURUM tabanlıdır — üç sütunun da indiği
 * ayrı ayrı doğrulanır, sabit `waitForTimeout` YOK.
 */
export async function asistaniAc(page: Page, fixedTime = ASISTAN_TIME) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  // 🔴 Rota gezinmeden ÖNCE kurulur; sonra kurmak ilk isteği kaçırırdı.
  await santiyeleriSabitle(page);
  await loginAt(page, fixedTime);
  await page.goto(ASISTAN_URL);
  await expect(page.getByLabel("Sohbet geçmişi")).toBeVisible();
  await expect(page.getByLabel("FİİL AI Asistanı")).toBeVisible();
  await expect(page.getByLabel("Sohbet bağlamı")).toBeVisible();
  // Sağ sütun: proje bağlamı GERÇEKTEN indi.
  await expect(page.getByLabel("Bağlamı Değiştir")).toBeVisible();
  // AI-BAĞLAM · şantiye kaskadı da indi. 🔴 Kadraj bu bekleme olmadan
  // çekilirse üç satır bir kare boyunca "Şantiye seçin" gösterir ve
  // baseline'ın hangi ara duruma oturduğu ŞANSA kalır.
  await expect(page.getByLabel("Şantiye Seç")).toBeVisible();
  await expect(page.getByTestId("ai-baglam-ilerleme")).toHaveText("%62");
}

/** `page.route`ın eşleştirdiği desen — `page.unroute` da AYNISINI ister. */
export const GECMIS_ROTA_DESENI = "**/api/backend/ai/conversations**";

/** Bağlam panelinin şantiye kaskadını besleyen uç. */
export const SANTIYE_ROTA_DESENI = "**/api/backend/projects/*/sites**";

/**
 * AI-BAĞLAM · `GET /projects/{id}/sites` yanıtını **sayfaya özel** sabitler.
 *
 * 🔴🔴 NEDEN GEREKLİ — ÖLÇÜLMÜŞ İKİZ AYRIŞMASI (K-IKIZ1).
 * `mock-backend.ts`in bu dalı her şantiye için `worker_count:
 * COUNT_PENDING("timesheet")` ve `progress_pct: METRIC_PENDING(...)` döndürür.
 * GERÇEK sunucu ikisini de DOLU döndürür: `worker_count` T4'te
 * (`sites/service/presenters.py::_worker_count`), `progress_pct` ILR-1'de
 * bağlandı. Yani ikiz, bu iki alanda sunucudan AYRIŞMIŞ durumda ve panelin
 * DOLU dalı hiçbir kadrajda görünmezdi — kapılar yeşil kalır, ekran canlıda
 * gerçek sayıyı basar ve kimse onu görmemiş olurdu. Aynı sınıfın kaydı bu
 * dosyanın kardeşlerinde de var (`mock-backend.ts:8162` `active_worker_count`
 * F-ILRUI'de tam bu sebeple düzeltildi — ama SATIR BAZINDAKİ sayaç
 * düzeltilmemiş kalmış).
 *
 * 🔴 NEDEN `mock-backend.ts` DEĞİL: o fikstür PAYLAŞILAN tek süreçte koşar ve
 * `SiteCard` Proje Detay ızgarasını da besler; oradaki düzeltme bu dilimin
 * kapsamı dışındaki kadrajları da oynatırdı. `page.route` sayfaya özeldir.
 * İkizin küresel ayrışması raporda **kapsam dışı bulgu** olarak açıldı.
 *
 * 🔴 İKİ DAL DA taşınır (K-IKIZ1): `s-1` DOLU (%62 · 48), `s-2` BOŞ — panel
 * ikisini de doğru basmak zorunda.
 */
export async function santiyeleriSabitle(page: Page) {
  await page.route(SANTIYE_ROTA_DESENI, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const kart = (
      id: string,
      code: string,
      name: string,
      status: string,
      dolu: boolean,
    ) => ({
      id,
      slug: name.toLowerCase().replace(/[^a-z]+/g, "-"),
      code,
      name,
      status,
      address: "Kuyubaşı Mah.",
      city: "Ankara",
      city_inherited: false,
      site_manager_name: "S. Öztürk",
      start_date: "2025-03-01",
      end_date: "2026-12-31",
      delivery_date: null,
      remaining_days: 157,
      section_count: 2,
      // Dolu `CountPlaceholder` `pending_module`u TAŞIMAYA DEVAM EDER
      // (`MetricPlaceholder`in TERSİ kural — sunucunun bilinçli emsali).
      worker_count: dolu
        ? { available: true, count: 48, pending_module: "timesheet" }
        : { available: false, count: null, pending_module: "timesheet" },
      // Dolu `MetricPlaceholder` `pending_module` TAŞIMAZ.
      progress_pct: dolu
        ? { available: true, value: "62", pending_module: null }
        : { available: false, value: null, pending_module: "site_diary" },
      is_draft: false,
      site_manager_user_id: null,
      safety_officer_user_id: null,
      safety_officer_name: null,
      safety_officer_is_outsourced: false,
      neighborhood: null,
      parcel: null,
      gps_coordinates: null,
      land_area_m2: null,
      construction_area_m2: null,
      floor_info: null,
      budget: null,
      facilities: {
        site_office: false,
        canteen: false,
        changing_room_wc: false,
        dormitory: false,
        infirmary: false,
      },
      electricity_subscription_no: null,
      water_subscription_no: null,
      planned_worker_count: null,
    });
    const items = [
      kart("s-1", "A-BLOK", "A-Blok Şantiyesi", "active", true),
      kart("s-2", "B-BLOK", "B-Blok Şantiyesi", "completed", false),
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        counts: { all: 2, active: 1, on_hold: 0, completed: 1 },
        items,
        totals: {
          total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
          subcontractor_count: { available: false, count: null, pending_module: "subcontracts" },
          active_worker_count: { available: true, count: 48, pending_module: "timesheet" },
          average_margin: { available: false, value: null, pending_module: "project_costs" },
        },
      }),
    });
  });
}

/**
 * `GET /ai/conversations` yanıtını **sayfaya özel** sabitler.
 *
 * 🔴 NEDEN `mock-backend.ts` DEĞİL: sahte backend globalSetup'ta TEK paylaşımlı
 * süreçte koşar ve durumu sıfırlayan hiçbir ucu YOKTUR
 * (`command grep -c 'resetMockState|__reset|resetState' e2e/mock-backend.ts`
 * → 0). Oradaki fikstürü bir uzunluk denemesi için değiştirmek, aynı anda
 * koşan öbür spec'lerin kadrajlarını bozardı. `page.route` sayfaya özeldir;
 * retry aynı yanıtı üretir.
 *
 * 🔴 Gövde şekli backend'in İNANCINDAN değil, SÖZLEŞMEDEN gelir: kalem tipi
 * üretilmiş `AiConversationRead`, zarf ise `mock-backend.ts`in
 * `/ai/conversations` dalıyla birebir aynı (`{ items, total }`).
 */
export async function gecmisiSabitle(
  page: Page,
  kayitlar: readonly AiConversationRead[],
) {
  await page.route(GECMIS_ROTA_DESENI, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: kayitlar, total: kayitlar.length }),
    });
  });
}

/**
 * Sol sütunu TAŞIRAN geçmiş. Damgalar `ASISTAN_TIME`a göre "Bugün" grubuna
 * düşer; sabit oldukları için kare de sabittir.
 */
export function uzunGecmis(adet: number): AiConversationRead[] {
  return Array.from({ length: adet }, (_, i) => ({
    id: `cc000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    title: `Uzun geçmiş sohbeti ${i + 1}`,
    message_count: (i % 9) + 1,
    created_at: "2026-07-31T06:00:00+00:00",
    updated_at: "2026-07-31T06:42:00+00:00",
  }));
}
