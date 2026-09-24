<!--
KAYNAK: docs/superpowers/specs/2026-07-30-santiye-formu-design.md §10 ve §15,
BIREBIR kopya (git show 9988481^:<yol>). Spec dosyasi 2026-09-23te silindi
(kullanici karari, commit 9988481); text-inventory.test.ts bekcisi bu iki
bolumu okumaya devam etsin diye test yaninda sabitlendi. ELLE DUZENLEME:
bu dosya bir envanterdir, yeni ekran dizesi eklenirse once buraya yazilir.
-->

## 10. Doğrulama

İstemci doğrulaması sunucununkini **taklit eder, yerine geçmez**; ikisi de
uygulanır. Hatalı alan `--color-danger` kenarlık alır, mesaj alanın altına
`.hint` ölçüsünde kırmızı basılır (`aria-describedby` ile bağlı) ve **ilk hatalı
alana odak taşınır**.

### 10.1 Zorunlu alanlar (mockup ★ işaretlileri)

| Satır | Alan | Mesaj |
|---|---|---|
| 66 | Şantiye Adı | "Şantiye adı zorunludur." |
| 68 | Bağlı Proje | — (rota bağlamından gelir, kullanıcı hata yapamaz) |
| 69 | Şantiye Şefi | "Şantiye şefi seçiniz." (**istisna aşağıda**) |
| 79 | İl / İlçe | "İl / ilçe zorunludur." |
| 85 | İnşaat Alanı (m²) | "İnşaat alanı zorunludur." |
| 94 | Başlangıç Tarihi | "Başlangıç tarihi zorunludur." |
| 95 | Planlanan Bitiş | "Planlanan bitiş tarihi zorunludur." |

Mockup'ta ★ taşıyan üç **belge** alanı (183, 188, 193) zorunlu **basılmaz**
(§4.6). **İSG Uzmanı (70) zorunlu değildir** (kullanıcı kararı 4, 2026-07-30):
alanda ★ yoktur, backend `_validate_site` taslak-dışında da aramaz; ipucu metni
("İSG mevzuatı gereği zorunlu") aynen basılır ama kural koymaz.
Onaylı sapma §11.5.

**GPS Koordinatı (83) için hiçbir doğrulama kuralı yoktur** — ne zorunluluk, ne
biçim (§4.2.1).

#### 10.1.1 İSTİSNA: kişi listesi yüklenemediğinde Şantiye Şefi zorunluluğu kalkar

**Kullanıcı kararı (2026-07-30).** `GET /users` `user_management:view` ister ve bu
izin yalnız sistem yöneticisindedir; `sites:full` yetkili bir proje müdürü formu
açtığında üç kişi seçicisi de **403** alır (plan TZ-4b).

Kural:

- **Kullanıcı listesi yüklenemediğinde (403 veya diğer hata) Şantiye Şefi
  zorunluluğu KALKAR** — alan boş bırakılabilir, `"Şantiye şefi seçiniz."` mesajı
  basılmaz ve form gönderilebilir (`site_manager_user_id: null` gider; alan
  backend'de nullable).
- **Liste başarıyla geldiğinde zorunluluk aynen işler.** Gevşeme kalıcı değildir,
  yalnızca sorgunun hatalı olduğu duruma bağlıdır.
- Seçicinin serbest metin kutusuna düşmesi **reddedildi** (kullanıcı kararı): boş
  geçilebilir bir seçici kalır, altında §15/23b metni basılır.

Onaylı sapma §11.15.

### 10.2 Taslakta gevşeyen kurallar

| Kural | Kaydet | Taslak |
|---|---|---|
| Şantiye adı | zorunlu | **zorunlu** (kimliksiz taslak listede ayırt edilemez) |
| Şef / İl-İlçe / İnşaat alanı / tarihler | zorunlu | **atlanır** |
| Bitiş ≥ Başlangıç | uygulanır | **uygulanır** (eksik değil, yanlış veri) |
| Negatif sayı yok | uygulanır | **uygulanır** |
| GPS | **kural yok** | **kural yok** (§4.2.1) |
| Tesis kutucukları | kural yok | kural yok |
| Bölüm satırı adı | zorunlu (dolu satırda) | **atlanır** — adsız satır sessizce atılır |
| Bölüm tarih sırası | uygulanır | **uygulanır** |

### 10.3 Tutarlılık kuralları ve mesajları

| Durum | Mesaj |
|---|---|
| Bitiş < Başlangıç | "Planlanan bitiş tarihi başlangıçtan önce olamaz." |
| Negatif alan/bütçe/işçi sayısı | "Değer negatif olamaz." |
| Sayı alanına metin | "Bu alan sayı olmalıdır." |
| Planlanan işçi sayısı ondalıklı | "İşçi sayısı tam sayı olmalıdır." |
| Şantiye kodu çakışması (409) | "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın." |
| Bölüm adı boş, satır dolu | "Bölüm adı zorunludur." |
| Bölüm bitiş < başlangıç | "Bölüm bitiş tarihi başlangıçtan önce olamaz." |
| Diğer sunucu hataları | mevcut `backendErrorMessage()` yardımcısı |

**GPS için istemci doğrulaması YOKTUR** (§4.2.1): ne biçim regex'i, ne
"koordinat okunamadı" mesajı, ne normalleştirme. Alan serbest metindir.

**Uzunluk koruması (2026-07-30, sessiz 422 sınıfı).** Sunucu sözleşmesinde
`maxLength` ilan eden **on** metin alanının hepsi istemcide `maxLength`
niteliğiyle korunur: `name`(150), `code`(50), `city`(100), `neighborhood`(150),
`parcel`(50), `address`(300), `gps_coordinates`(50), `floor_info`(100),
`electricity_subscription_no`(50), `water_subscription_no`(50). Sınırlar
`SITE_FIELD_MAX_LENGTH` haritasında durur ve `field-limits.test.ts` onları
**üretilen `openapi.json` ile karşılaştırır** — elle yazılmış sayı yoktur, yeni
bir sınır eklenirse test kırmızı olur. **YALNIZ uzunluktur:** hiçbir alana
biçim doğrulaması, regex ya da yeni hata metni eklenmemiştir; GPS'in "biçim
doğrulaması yok" kuralı (§4.2.1, §11.13) aynen geçerlidir.

**Kısmi başarı durumu yoktur**: gönderim atomiktir (§3.4), ya hepsi yazılır ya
hiçbiri. Önceki sürümdeki "Şantiye oluşturuldu, ancak {n} bölüm eklenemedi…"
mesajı **kaldırılmıştır**.

**Şantiye bütçesinin proje bütçesiyle karşılaştırılması YOKTUR** (koordinatör
kararı, 2026-07-30): şantiye bütçelerinin toplamı proje bütçesini aşsa bile
**uyarı verilmez**. Gerekçe: proje bütçesi P1.1a'da dört kalemden hesaplanıyor,
şantiye bütçesi elle giriliyor; ikisi aynı anlam katmanında değil ve bu formda
diğer şantiyelerin bütçesi zaten okunmuyor — okumak için ek istek gerekirdi.

---

## 15. Metin envanteri (kullanıcıya görünen tüm dizeler)

| # | Metin | Satır | Yer |
|---|---|---|---|
| 1 | Projeler | 36 | kırıntı yolu |
| 2 | *{proje adı}* | 37 | kırıntı yolu (veri) |
| 3 | Yeni Şantiye | 38 | kırıntı yolu (aktif) |
| 4 | İptal | 41, 225 | üst bar + alt şerit |
| 5 | Şantiyeyi Oluştur | 42, 227 | üst bar + alt şerit |
| 6 | Yeni Şantiye Ekle | 49 | `h1` |
| 7 | Şantiye bir projeye bağlıdır — poz kotaları proje sözleşmesinden dağıtılır | 50 | alt başlık |
| 8 | Bağlı Proje: | 56 | bilgi kutusu (kalın) |
| 8a | Taahhüt Projesi / Kendi Yatırım Projesi / Kat Karşılığı Projesi | 56 | bilgi kutusundaki proje tipi etiketi. Mockup 56 **"Taahhüt Projesi"** yazar — sekme sözlüğündeki kısa "Taahhüt" değil; ayrı sözlük (`project-type-label.ts`), `PROJECT_TABS` **bozulmaz**. `kendi_yatirim` karşılığı "Proje - Kendi Yatırım.dc.html" 57'de kanıtlı; `kat_karsiligi` bu bağlamda mockup'ta geçmiyor, kanıtlı `{tip} Projesi` kalıbı uygulandı (2026-07-30) |
| 9 | Şantiye oluşturulduktan sonra **poz dağılımı** ekranından bu şantiyeye kota atayabilirsiniz. | 57 | bilgi kutusu |
| 10 | Poz Dağılımı → | 59 | edilgen bağlantı |
| 11 | 📍 Şantiye Bilgileri | 64 | kart başlığı |
| 12 | Şantiye Adı | 66 | etiket |
| 13 | C-Blok Şantiyesi | 66 | yer tutucu |
| 14 | Şantiye Kodu | 67 | etiket |
| 15 | SNT-2026-003 | 67 | yer tutucu |
| 16 | Boş bırakılırsa otomatik | 67 | ipucu |
| 17 | Bağlı Proje | 68 | etiket |
| 18 | Şantiye, girildiği projeye bağlıdır | — | `title` (§11.1) |
| 19 | Şantiye Şefi | 69 | etiket |
| 20 | Seçiniz… | 68–71 | seçici ilk seçeneği |
| 21 | İSG Uzmanı | 70 | etiket |
| 22 | Dış Kaynak — OSGB | 70 | seçenek |
| 23 | İSG mevzuatı gereği zorunlu | 70 | ipucu (**kural değil** — §11.5) |
| 23a | Listede aradığınız kişi yoksa kullanıcı listesi henüz tamamlanmamış olabilir. | — | seçici altı notu (§9.2.1) |
| 23b | Kişi listesini görme yetkiniz yok — bu alanları boş bırakabilirsiniz. | — | seçici altı notu, **yalnız 403'te** (§10.1.1, §11.15) — kullanıcı onayı 2026-07-30 |
| 24 | Durum | 71 | etiket |
| 25 | Hazırlık / Aktif / Beklemede | 71 | seçenekler |
| 26 | 🗺 Konum & Alan | 77 | kart başlığı |
| 27 | İl / İlçe · Çankaya / Ankara | 79 | etiket · yer tutucu |
| 28 | Mahalle · Kuyubaşı Mah. | 80 | etiket · yer tutucu |
| 29 | Ada / Parsel · 1234 / 5 | 81 | etiket · yer tutucu |
| 30 | Açık Adres · Cadde, sokak, no | 82 | etiket · yer tutucu |
| 31 | GPS Koordinatı · 39.9042, 32.8597 | 83 | etiket · yer tutucu (**serbest metin**) |
| 32 | Puantaj konum doğrulaması için | 83 | ipucu — alanın amacı; **kural değil** (§4.2.1). GPS için hata metni **yoktur** |
| 33 | Arsa Alanı (m²) · 2840 | 84 | etiket · yer tutucu |
| 34 | İnşaat Alanı (m²) · 6420 | 85 | etiket · yer tutucu |
| 35 | Kat Sayısı · 2 bodrum + 10 normal | 86 | etiket · yer tutucu |
| 36 | 📅 Takvim & Bütçe | 92 | kart başlığı |
| 37 | Başlangıç Tarihi | 94 | etiket |
| 38 | Planlanan Bitiş | 95 | etiket |
| 39 | Süre (Gün) · 480 | 96 | etiket · yer tutucu |
| 40 | Otomatik hesaplanır | 96 | ipucu |
| 41 | Şantiye Bütçesi (₺) · 11200000 | 97 | etiket · yer tutucu |
| 42 | 🏗 Bölümler (Fazlar) | 104 | kart başlığı |
| 43 | Şantiye iş fazlarına bölünür — her bölümün kendi iş kalemleri olur | 105 | yan not |
| 44 | + Bölüm Ekle | 106 | başlık butonu |
| 45 | Bölüm Adı / Sorumlu / Başlangıç / Bitiş / Tahmini Bedel | 110–114 | tablo başlıkları (**Tahmini Bedel** başlığı kalır, hücresi `—`) |
| 45a | — | 123 | Tahmini Bedel hücresi (yer tutucu, §3.5) |
| 45b | İş kalemlerinden hesaplanacak | — | Tahmini Bedel hücresi `sr-only` açıklaması |
| 46 | Bölüm ekle | 138 | kesikli buton — mockup'taki "veya şablon kullan" **kısaltıldı** (§11.3) |
| 47 | Henüz bölüm eklenmedi — şantiye bölümsüz de oluşturulabilir. | — | boş durum (§6.4) |
| 48 | {n}. bölümü sil | 124 | `aria-label` |
| 49 | 📦 Depo & Şantiye Altyapısı | 148 | kart başlığı |
| 50 | Depo Alanları | 151 | grup etiketi |
| 51 | D-1 Kapalı Ambar | 153 | kutucuk |
| 52 | D-2 Açık Alan (Demir, kum, çakıl) | 154 | kutucuk |
| 53 | D-3 Soğuk Hava Deposu | 155 | kutucuk |
| 54 | Şantiye Tesisleri | 159 | grup etiketi |
| 55 | Şantiye Ofisi (Konteyner) | 161 | kutucuk |
| 56 | İşçi Yemekhanesi | 162 | kutucuk |
| 57 | Soyunma / WC | 163 | kutucuk |
| 58 | İşçi Yatakhanesi | 164 | kutucuk |
| 59 | Revir / İlk Yardım | 165 | kutucuk |
| 60 | Elektrik Aboneliği · Abone no | 170 | etiket · yer tutucu |
| 61 | Su Aboneliği · Abone no | 171 | etiket · yer tutucu |
| 62 | Planlanan İşçi Sayısı · 48 | 172 | etiket · yer tutucu |
| 63 | 📎 Şantiye Belgeleri | 178 | kart başlığı |
| 64 | Belge modülü bekleniyor — şantiyeyi oluşturduktan sonra belgeleri yükleyebileceksiniz. | — | kart notu |
| 65 | Yapı Ruhsatı · Belediye onaylı | 183 | belge kutusu |
| 66 | İSG Risk Değerlendirmesi · Şantiye başlangıcında zorunlu | 188 | belge kutusu |
| 67 | Acil Durum Planı · Tahliye ve müdahale planı | 193 | belge kutusu |
| 68 | Şantiye Yerleşim Planı · Vaziyet planı, depo yerleşimi | 198 | belge kutusu |
| 69 | Zemin Etüt Raporu · Jeoteknik rapor | 203 | belge kutusu |
| 70 | Başlangıç Fotoğrafları · Arsa mevcut durumu | 208 | belge kutusu |
| 71 | Yakında | — | belge rozeti |
| 72 | Belge modülüyle birlikte gelir | — | `pendingModuleLabel("documents")` |
| 73 | Diğer şantiye belgelerini sürükleyin | 214 | sürükle-bırak |
| 74 | Sigorta poliçesi, çevre izni, hafriyat izni vb. | 215 | sürükle-bırak alt metni |
| 75 | Oluşturduktan sonra poz dağılımı ekranına git | 222 | edilgen kutucuk |
| 76 | Sözleşme modülüyle birlikte gelir | — | `pendingModuleLabel("contracts")` |
| 77 | İş kalemleri modülüyle birlikte gelir | — | `pendingModuleLabel("boq")` — Tahmini Bedel |
| 78 | Taslak Kaydet | 226 | alt şerit |
| 79 | Kaydediliyor… | — | gönderim durumu |
| 80 | Yükleniyor… / Kullanıcılar yüklenemedi | — | seçici durumları |
| 81 | Proje bulunamadı | — | hata durumu |
| 82 | *(§10 doğrulama mesajlarının tamamı)* | — | alan hataları |

---

