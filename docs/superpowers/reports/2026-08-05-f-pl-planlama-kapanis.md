# F-PL — Şantiye Planlama Ekranı · Kapanış Raporu

Tarih: **2026-08-05** · Repo: `frontend/` · Dal: `feat/f-pl-planlama` ·
Spec: `../specs/2026-08-04-f-pl-planlama-design.md` · Plan: `../plans/2026-08-04-f-pl-planlama.md` ·
Mockup (kanonik): `projedesign/Şantiye - Planlama.dc.html` (**P**)

---

## 1. Teslim edilen

| Rota | Bileşen | Mockup |
|---|---|---|
| `.../santiyeler/[siteId]/gunluk-kayit/planlama` | `SitePlanningView` | `Şantiye - Planlama.dc.html` |

Hafta durumu URL'dedir (`?week=YYYY-MM-DD`, Pazartesi bazlı) — bağlantı paylaşılabilir.

### Commit zinciri

| Commit | Task |
|---|---|
| `8e567a9` (**main'de**) | BC+PL openapi devri — 110 → **115 yol / 169 operasyon** |
| `a291e74` | Onaylı spec + plan |
| `8ee50ad` | T1 — `useSitePlan` + 4 mutasyon hook'u + e2e mock uçları |
| `8b32e70` | T2 — ızgara görünümü (okuma) |
| `4ef5517` | T3 — düzenleme etkileşimi + dört PUT'luk kaydetme |
| `91a694a` | T4 — e2e + görsel spec'ler |
| `0ef084c` | T5 — final review bulgularının kapatılması |

### Kapılar (şef tarafından TEKRAR koşularak doğrulandı)

`lint` ✓ · `typecheck` ✓ · `test` **214 dosya / 1949 test** ✓ · `build` ✓ ·
**5. kapı** `playwright --grep-invert "gorsel"` **41/41** ✓ · `git status` temiz, hiç `.png` yok.

### BFF

**Yeni kök EKLENMEDİ — gerekmedi.** Planlama uçlarının tamamı (`GET /sites/{id}/plan`,
`PUT .../plan/{rows,cells,goals,sprint}`, `GET .../plan/day-summary`) ve F-PL'nin bölüm listesi ucu
(`GET /sites/{id}/sections`) ilk segmenti `sites` olduğu için mevcut kökten geçer; `route.test.ts`'te
beş plan ucu için adlı kapı testi var. **`documents` kökleri BU dilimde AÇILMADI** (BC diliminin işi).

---

## 2. FINAL REVIEW'de bulunan 3 GERÇEK kusur (hepsi kapatıldı)

### Bulgu 1 — ENGELLEYİCİ: plan sıfırdan hiç oluşturulamıyordu

Backend (`site_planning/read.py::build_week`) grupları YALNIZ mevcut satırlardan türetiyor. Zincir:
satırı olmayan şantiyede `groups: []` → ekran "Bu hafta için plan satırı eklenmemiş." basıp ızgarayı
hiç çizmiyor → "+ Satır" yalnız grup başlığında olduğu için **hiçbir yerde yok**. Aynı nedenle, henüz
satırı olmayan bir bölüme satır açmak da imkânsızdı — oysa mockup'ın ana yapısı bölüm gruplu ızgaradır
(P121-124). Onaylı spec §3 satır ekleme formunu zaten "etiket + işçi sayısı + **bölüm**/ekipman türü"
diye tanımlıyordu; uygulama bölümü seçtirmiyor, grubun bölümünü devralıyordu.

**Düzeltme:** yeni `useSiteSections` hook'u (`GET /sites/{id}/sections`) · `PlanRowAddPopover`'a **Bölüm**
seçici (tür "Ekip"te açık, "Makine/Ekipman"da kapalı ve `section_id: null` — backend kuralı) · boş
ızgarada "+ Satır" giriş noktası (salt-okurda devre-dışı, gizli değil) · `addRow` artık grubu olmayan
bölüm için grubu da açıyor. 6 adlı Vitest + 1 e2e.

### Bulgu 2 — ORTA: başlığı boş hedef sessizce atılıyordu

`buildGoalsBody` başlığı boş hedefleri `filter` ile düşürüyordu: ekranda **"Haftalık hedefler:
kaydedildi"** yazıyor, hedef hiç yazılmıyor ve taslak sunucudan yeniden kurulunca kayboluyordu.
WORKFLOW §3 "sessiz atlama yok" ihlali. Aynı ekranda boş satır ETİKETİ kaydetmeyi görünür mesajla
engelliyordu — **iki farklı disiplin** bulgunun işaretiydi.

**Düzeltme:** satırlardaki desenin aynısı — kaydetme hiç başlamaz, görünür Türkçe gerekçe basılır,
hiç istek atılmaz. Vitest (`saveCalls === []`) + e2e (reload sonrası hedef sayısı değişmez).

### Bulgu 3 — T4'te bulundu: boş plan hücresi gerçek tarayıcıda tıklanamıyordu

`.plan-pop-anchor` `inline-flex` (shrink-to-fit) + içindeki buton `width: 100%` → içeriği olmayan
hücrede çapa genişliği 0, buton 0×22px. Sonuç: **planı olmayan güne plan girilemiyordu** — ekranın asıl
işlevi kırıktı. Dolu hücreler çalıştığı için gözden kaçmıştı; **jsdom düzen hesaplamadığı için dört kapı
bunu göremez.** 5. kapının değerinin somut kanıtı.

**Düzeltme:** hücre çapasına `display: block` + CSS regresyon testi.

---

## 3. Onaylı sapmalar ve kalıcı pending'ler

> Aşağıdakiler **onaylı sapmalardır — sapma diye geri alınmaz** (WORKFLOW §3).

- **Drill sidebar'a "Planlama" öğesi EKLENMEDİ.** P64-65 kendi sol menüsünde Planlama'yı ayrı bir
  sidebar öğesi gösteriyor; basılmadı. **Kabuk canon'u şantiyenin 7 sekmesidir**; Planlama, "Hakediş
  Özeti" gibi **"Günlük Kayıt" sekmesinin alt görünümüdür**, giriş noktası mod anahtarıdır.
  (HÖ62'deki "Hakediş Özeti" sidebar öğesinin F-SD'de eklenmemesiyle aynı gerekçe.)
  **Kullanıcı kararı 2026-08-05 — yeniden tartışılmaz.**
- **Malzeme Planı kartı PENDING** (P185-201): stok/satınalma modülü yok. Kart başlığıyla, yerinde,
  gerekçeli devre-dışı basılır. Mockup'ın üç sahte malzeme satırı (Nervürlü Demir Ø12 / C25-30 Beton /
  Kalıp Yağı) ve "Acil Sipariş →" linkleri **uydurma veri olarak BASILMAZ** — gerçek stok gibi görünen
  sayılar sahada yanlış karar verdirirdi. Bileşen prop almaz, state tutmaz, ağa çıkmaz.
- **Ay / Sprint görünüm kipleri DEVRE-DIŞI** (P94-95, kullanıcı kararı S2): kendi mockup'ları çizilmedi,
  ekran İCAT EDİLMEDİ. Öğeler silinmedi, görünür gerekçeyle duruyor.
- **Tarih artefaktı istisnası:** P105'in "21 – 27 Temmuz 2026" sabiti ve P111-117 tarihleri
  KOPYALANMADI — gerçek takvimden, Pazartesi bazlı hafta üretilir.

### Mockup'ta karşılığı olmayan, türetilen kararlar (gerekçeleri kodda)

| Durum | Karar | Gerekçe |
|---|---|---|
| Hafta aralığı ay/yıl sınırında | İki ay adı basılır (`31 Ağustos – 6 Eylül 2026`) | Tek ay adı yanlış bilgi olurdu |
| `tag: null` | Zeminsiz düz metin | `gray` kullanıcının SEÇTİĞİ bir renktir (P131 "Bakım"); "renk seçilmemiş" ile aynı şey değil |
| İşçi sayısı `null` | Parantez hiç basılmaz | `Tower Crane ()` olmaz |
| Aktif sprint yok | "Aktif Sprint:" etiketi hiç basılmaz | Boş etiket, mockup'ta olmayan bir bilgi satırı uydururdu |
| Bölümsüz ekip grubu | Başlık "Bölümsüz Ekipler" | `(kind, section_id)` anahtarıyla erişilebilir; "Makine & Ekipman" altına DÜŞMEMELİ |

### "Sırıtma testi" — türetilen kontrollerin görsel dili

Onaylı spec §3'ün şartı: her kontrol ızgaranın KENDİ görsel dilinden türetilir. Uygulama: popover =
kartın (P101) küçük ölçekli hali (aynı kenarlık + gölge, yarıçap çip 5px ile kart 14px arasındaki mevcut
basamak) · renk seçicinin seçenekleri **ızgaradaki çipin ta kendisi** (aynı `.plan-cell__chip--*`
sınıfları), seçili durum `border-color: currentcolor` — **palete tek renk bile eklenmedi** · hedef durum
kontrolü rozetin ölçülerini giyer (P209) · "+ Satır" grup başlığının rengini devralır (`color: inherit`).
Toplam **4 yeni token**, dördü de ızgaradan türetildi.

---

## 4. Kalıcı kurallar (sonraki dilimler için)

**Dört PUT'un sırası ZORUNLU ve 1→2 bağımlıdır:** `rows` → `cells` → `goals` → `sprint`.
Yeni satırın gerçek `id`si YALNIZ `rows` yanıtından (`SitePlanRowsResult`) gelir; hücre gövdesi `row_id`
istediği için hücreler ancak satırlar yazıldıktan sonra gönderilebilir. Eşleme satırın **doğal anahtarı
`(kind, section_id, label)`** üzerinden kurulur — `sort_order` ile DEĞİL (backend onu yeniden
numaralandırmakta serbesttir, doğal anahtarı ise değiştiremez: `(site_id, kind, section_id, label)`
tekilliği zorlanıyor).

**Kapsam disiplini:** dört uç da DEĞİŞTİRME (replace) semantiğindedir — gövdede geçmeyen kayıt SİLİNİR.
`rows` gövdesi **ŞANTİYENİN TÜM** satırlarını, `cells` gövdesi **YALNIZ görünen haftanın** hücrelerini
taşır (hafta dışı tarih → backend 422). Kirli olmayan bölüme istek ATILMAZ.

**Kısmi hata:** bir adım patlarsa akış DURUR, sonraki adımlar hiç denenmez, hangi adımın yazıldığı
ekranda kalır — genel "kaydedildi" mesajı YOKTUR. Başarılı adımın kirlilik bayrağı düşer, dolayısıyla
"Yeniden dene" yalnız kalan adımları gönderir.

**openapi devri tuzağı (bu dilimde yakalandı):** `backend/openapi.json` gitignore'lu bir **üretim
çıktısıdır** ve backend checkout'unda BAYAT durabilir — bu turda BC'nin `documents.description`
`maxLength: 2000` kısıtını taşımıyordu. **Kopyalamadan ÖNCE `app.openapi()` ile taze üretilmeli**,
var olan dosya kopyalanmamalıdır.

---

## 5. Borç adayları (backend)

- `GET /sites/{id}/plan` gruplarını yalnız mevcut satırlardan türetiyor → şantiyenin bölüm listesi ayrı
  bir istekle çekilmek zorunda kaldı. Plan yanıtına "satırı olmayan bölümler" eklenirse bu istek kalkar
  (additive, acele değil).
- Ay / Sprint görünüm kipleri: ne mockup ne uç var; ikisi de gelince kipler açılır.
- Malzeme Planı kartı stok/satınalma modülünü bekliyor.

---

## 6. Kapanış zinciri durumu

- [x] Beş kapı yeşil (şef tarafından tekrar koşuldu)
- [x] `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md` güncellendi
- [x] Onaylı sapma spec'e + bu rapora işlendi
- [ ] Görsel baseline turu — `site-planning-visual.spec.ts` **4 kadraj İLK KEZ** üretilecek;
      diğer 39 baseline'ın DEĞİŞMEDİĞİ artifact'ta **bayt bazında** doğrulanacak
      (F-SD'nin "Planlama" linkleri aktifleştiği için `gunluk-kayit-*` baseline'ları etkilenmiş
      olabilir — **varsayma, karşılaştır**)
- [ ] PR → CI yeşil → merge kararı kullanıcıda
