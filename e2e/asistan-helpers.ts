import { expect, type Page } from "@playwright/test";

/**
 * AI-CHAT-2 · `/asistan` görsel kadrajlarının ortak hazırlığı.
 *
 * 🔴 SAAT DONDURULUR. Panel sohbet kartlarını "Bugün / Bu Hafta / Geçen Hafta"
 * gruplarına **bugüne göre** yerleştirir; saat donmazsa aynı baseline yarın
 * farklı başlıklar altında çizilir ve kare her gün kırmızı olur. Fikstür
 * tarihleri `mock-backend.ts::AI_CONVERSATION_FIXTURES` ile birlikte seçildi.
 */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/** Fikstürün en yeni sohbeti 31 Tem 06:42Z; bu an onu "Bugün"e düşürür. */
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
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await loginAt(page, fixedTime);
  await page.goto(ASISTAN_URL);
  await expect(page.getByLabel("Sohbet geçmişi")).toBeVisible();
  await expect(page.getByLabel("FİİL AI Asistanı")).toBeVisible();
  await expect(page.getByLabel("Sohbet bağlamı")).toBeVisible();
  // Sol sütun: sohbet kartları GERÇEKTEN indi (yükleniyor değil).
  await expect(
    page.getByRole("button", { name: /Güneşkent A-Blok/ }),
  ).toBeVisible();
  // Sağ sütun: proje bağlamı GERÇEKTEN indi.
  await expect(page.getByLabel("Bağlamı Değiştir")).toBeVisible();
}
