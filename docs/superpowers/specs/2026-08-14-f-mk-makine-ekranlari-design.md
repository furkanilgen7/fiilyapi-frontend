# F-MK — Makine & Ekipman ekranları (frontend)

Tarih: 2026-08-14 · Repo: `frontend/` · Dal: `feat/f-mk-makine-ekranlari`
Yönetim oturumu yazdı. Backend karşılığı: **MK-1** (✅ CANLIDA, merge `b3a7f45`,
9 `equipment` yolu) — `backend/docs/superpowers/specs/2026-08-13-mk1-makine-cekirdegi-design.md`.

Mockup'lar (`ls | grep` ile doğrulandı):
**M1** `Makine & Ekipman.dc.html` · **M2** `Form - Makine Ekle.dc.html` ·
**M3** `Makine - Çalışma Kaydı.dc.html` · **M4** `Makine - Yakıt Takibi.dc.html`

---

## 0. 🔴 MOCKUP RAKAMLARI GÖSTERMELİKTİR (kullanıcı kararı, 2026-08-14)

Mockup'taki **sayılar** (KPI değerleri, tablo toplamları, yüzdeler) yalnız görsel doldurmadır.
**Ekran YAPISI, sütunları, etiketleri, ölçüleri ve durum davranışı mockup'tan BİREBİR alınır** —
sayılar sunucudan gelir. Fiilen: M3'ün tfoot'u kendi satırlarıyla tutarsızdır (692 saat olması
gerekirken 428 yazıyor); **sunucu satırlardan toplar** (MK-1 K15) ve ekran **sunucunun toplamını**
basar, mockup'ın sabit sayısını DEĞİL.

Bu, WORKFLOW §3'ün %100 mockup sadakati kuralını **daraltmaz**: sadakat yapı/ölçü/yerleşim
içindir; veri her zaman sunucudan gelir.

---

## 1. Rotalar

| Rota | Mockup | Not |
|---|---|---|
| `/makine` | **M1** | Ekipman kart ızgarası + KPI'lar. ComingSoon'dan ÇIKAR |
| `/makine/yeni` | **M2** | Ekipman formu (5 kart) |
| `/makine/[id]/duzenle` | **M2** | Aynı form, düzenleme kipi (K4) |
| `/makine/calisma` | **M3** | Çalışma kaydı özeti + haftalık grafik + son kayıtlar |
| `/makine/yakit` | **M4** | Yakıt takibi + sapma listesi + günlük kayıt tablosu |

**Alt-navigasyon (K1):** M3'ün sidebar'ı ile M4'ün sekme çubuğu **farklı dört öğe** listeliyor
(M3: Ekipman Listesi/Çalışma Kaydı/**Bakım Takvimi**/Yakıt Takibi · M4: Ekipman Listesi/Çalışma
Kaydı/**Kira Hakedişi**/Yakıt Takibi). **Kanonik küme ikisinin BİRLEŞİMİdir**, beş sekme:
`Ekipman Listesi` · `Çalışma Kaydı` · `Yakıt Takibi` + **`Kira Hakedişi` ve `Bakım Takvimi`
DEVRE-DIŞI + görünür gerekçe** (biri MK-2'de yazılıyor, öbürünün mockup'ı yok).
**Emsal: F-TH kalıcı kuralı — rotası olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır.**

---

## 2. T1 — devir borcu (dilimin İLK işi)

1. Hazır openapi (backend `main` @ `b3a7f45`ten yönetimce üretildi, **171 yol** doğrulandı):
   `<SCRATCHPAD>/openapi-b3a7f45.json` → `openapi/openapi.json` → `pnpm gen:api` → **TEK commit**.
   🔴 **Backend reposuna DOKUNMA** — orada MK-2 çalışıyor.
2. 🔴 **BFF `ALLOWED_ROOTS`'a `equipment` EKLE** + testle kilitle.
   **Canlıda şu an `/api/backend/equipment` → 404 döndüğü yönetimce doğrulandı**; bu kök
   eklenmeden ekranların hiçbiri canlıda çalışmaz (jsdom testleri bunu GÖRMEZ).

---

## 3. Bağlanan kararlar

**K1 — Alt-navigasyon birleşimi** (§1). Devre-dışı sekmeler görünür Türkçe gerekçe taşır
("Kira hakedişi ekranı sıradaki dilimde açılacak" · "Bakım takvimi mockup'ı henüz yok").

**K2 — Rozetler SUNUCUDAN gelir, istemcide hesaplanmaz.** MK-1 `consumption_status`
(`normal`/`warning`/`critical`) ve durum sayaçlarını sunucudan veriyor. **Eşik/yüzde istemcide
YENİDEN HESAPLANMAZ** — F-P10 "rozet sunucu damgasıdır" kanonu; iki yerde yaşayan eşik ayrışır.

**K3 — `null` gelen türev alan "—" basar, 0 BASMAZ.** MK-1 fail-closed dört `null` yolu üretiyor
(`lt_km` birimi → mesafe verisi yok · norm yok · saat 0 · kapasite 0). Ekran bunları **"—" +
başlık ipucuyla** gösterir; 0 basmak "hiç yakmadı"/"hiç çalışmadı" demektir ve YANLIŞTIR.
🔴 Özellikle **`lt_km` normlu ekipmanda (M4'teki Damperli Kamyon) sapma sütunu "—"dir** — mockup
orada "%16 yüksek" çiziyor ama sunucu `deviation_reason: "no_distance_data"` döner;
**sunucu kazanır** (§0), hücreye gerekçe ipucu konur.

**K4 — Ekipman detay sayfası YOK, düzenleme rotası VAR.** Hiçbir mockup detay sayfası çizmiyor
ve kartlar tıklanabilir değil. Kart üzerinde **"Düzenle"** eylemi açılır → `/makine/[id]/duzenle`
(aynı form, düzenleme kipi). Gerekçe: `PATCH /equipment/{id}` ucu var, kullanıcının kart bilgisini
düzeltmesi için başka yol yok. **Onaylı sapma.**

**K5 — 🔴 DÜZENLEME KİPİNDE "SUNUCU NULL'INI EZME" KAPISI ZORUNLUDUR.** M2'nin
`Kategori`/`Durum`/`Yakıt Tipi`/`Amortisman Süresi`/`Bakım Periyodu`/`Kira Tipi` seçicilerinin
çoğunda **boş seçenek yoktur** → ekranda hep dolu görünür. F-TB1'de kapatılan sınıfın **birebir
aynısı**: `touched` izi + **tip-kilitli** `omitFields`; yalnız `detail.<alan> === null &&
!touched` iken anahtar gövdeden düşer. Oluşturma kipi etkilenmez.
**Emsaller: `8ac9369` (personel) · F-TB1 `period-fields.ts` (hakediş).** Bu kapı olmadan dilim
kapanmaz — her ilgili alan için test yazılır.

**K6 — `Atandığı Proje` etiketi mockup'tan, alanı ŞANTİYEDİR.** MK-1 K4: sunucuda `site_id`.
Seçici şantiye listesinden beslenir, `Depoda (Atanmadı)` = `null`. Mockup'ın etiketi korunur
(sadakat), veri kaynağı doğru olandır. **Onaylı sapma, ROADMAP'e yazılır.**

**K7 — `Marka` ve `Model` AYRI iki input.** MK-1 K1 (sunucuda ayrı kolon); mockup tek alan
çiziyor ("Marka / Model") ama liste ekranı yalnız markayı basıyor. **Onaylı sapma.**

**K8 — `Alış Bedeli` koşullu zorunludur.** MK-1 K2: `ownership === "owned"` iken zorunlu (sunucu
422). Form bunu **istemcide de** doğrular (mockup'ın `*` işareti korunur ama kiralıkta düşer) —
sunucu hatası tek savunma bırakılmaz.

**K9 — M1 KPI'ları: mockup ÜÇ sayaç çiziyor, sunucu DÖRT veriyor** (`idle` dahil, MK-1 K21).
**Mockup kazanır: üç kart basılır.** Dördüncü sayaç yazılmaz (WORKFLOW §3). `idle` ekipman kart
ızgarasında kendi rozetiyle zaten görünür.

**K10 — Kayıt EKLEME formları PENDING.** M3:49 `+ Kayıt Ekle` ve M4:22 `+ Yakıt Girişi`
butonlarının **form mockup'ı YOK**. Uçlar MK-1'de açık ama **form İCAT EDİLMEZ** (WORKFLOW §3 —
"Şantiye Ekle" dersi). Butonlar **devre-dışı + görünür gerekçe** basılır ve **mockup istenir**.

**K11 — Kategori ikonu istemcide eşlenir.** MK-1 ikonu DB'de tutmuyor; M1'in emojileri
(🏗🚜🔧🚛⚙️🏭) kategori enum'undan haritayla üretilir, **tek dosyada**.

**K12 — Kart alt kutuları DURUMA GÖRE şekil değiştirir** (M1'in gerçek davranışı):
`Çalışıyor` → (Günlük Kira, Operatör) ikilisi · `Arızalı`/`Bakımda` → tek geniş uyarı kutusu
(`status_note` + `status_expected_date`). MK-1 üçünü de alan olarak veriyor.

---

## 4. Kapsam dışı

- Kira Hakedişi ekranı (**MK-2 backend'i şu an yazılıyor**) · Bakım Takvimi (mockup yok)
- Çalışma/yakıt **giriş formları** (K10) · ekipman belgeleri yüzeyi (MK-2'de)
- Ekipman detay sayfası (K4 — mockup yok)

---

## 5. Kabul kriterleri

1. Beş rota canlı; `/makine` ve alt sekmeler ComingSoon'dan çıktı; sidebar girişi doğru.
2. openapi **171 yol** + `schema.d.ts` senkron (tek commit) + BFF `equipment` kökü testli.
3. **K5 kapısı** her ilgili seçici için testli (sunucu `null` + dokunulmamış → anahtar GİTMEZ;
   dokunulmuş → gider; dolu değer → aynı gider; oluşturma kipi etkilenmez).
4. **K3**: `null` türev alanlar "—" basıyor, hiçbir yerde uydurma 0 yok — testli.
5. **K2**: hiçbir eşik/yüzde istemcide hesaplanmıyor (rozet sunucudan) — testli.
6. **K10**: iki buton devre-dışı + görünür gerekçe; silinmemiş.
7. Beş kapı yeşil (`lint`/`typecheck`/`test`/`build`/fonksiyonel e2e).
   🔴 **5. kapıdan ÖNCE port denetimi** — `lsof -nP -iTCP:3000 -sTCP:LISTEN`, bayat `next-server`
   öldürülür (F-TB1 dersi: bayat sunucu kapıyı **YEŞİL** geçirebilir).
8. Görsel baseline turu: yeni ekranlar → **yeni kareler beklenir**; mevcut karelerde değişiklik
   yalnız sidebar'a öğe eklenirse beklenir — fark `cmp` ile **ÖLÇÜLÜR** ve gerekçesi yazılır.
   "Değişmedi" varsayılmaz.
