# RAPOR — F-TH Frontend Dilimi (Taşeron Hakedişi Ekranları)

Tarih: 2026-08-03 · Dal: `feat/f-th-taseron-hakedis` (main'e MERGE EDİLMEDİ, bu rapor itibarıyla) ·
Brief: `.superpowers/sdd/2026-08-03-f-th-taseron-hakedis-ekranlari/task-7-brief.md` ·
Spec: `docs/superpowers/specs/2026-08-03-f-th-taseron-hakedis-ekranlari-design.md` ·
Plan: `docs/superpowers/plans/2026-08-03-f-th-taseron-hakedis-ekranlari.md` ·
Ledger: `.superpowers/sdd/2026-08-03-f-th-taseron-hakedis-ekranlari/progress.md`

## Ne yapıldı (T1-T7 özeti + commit sha listesi)

Dalın main'den ayrılma noktası: `45cf16b`. Commit aralığı `45cf16b..4274e1a` (T1-T6 uygulama, sıralı) + bu
rapor (T7, doküman-only, ürün kodu yok):

| Commit | Task | Açıklama |
|---|---|---|
| `0836574` | T1 | Altyapı — BFF `ALLOWED_ROOTS`'a 3 kök, okuma/yazma hook'ları, F-P7 ile paylaşılan `shared/status.ts`+`status-actions.ts`, e2e mock veri modeli |
| `341b1ce` | T2 | Taşeron hakediş liste ekranı (`/hakedisler/taseron`) + `/hakedisler`in "İşveren \| Taşeron" sekmesi |
| `d5df22c` | T2 fix | Rozet renk eşlemesi tekleştirme (kullanıcı kararı — bkz. onaylı sapmalar) |
| `a6e5cad` | T3 | Oluştur/düzenle formu + sözleşme seçim adımı (`/hakedisler/taseron/yeni`, `.../duzenle`) |
| `6f1bc6d` | T3 fix | `unit_price: null` (fiyat eksik) ile gerçek `0` ayrımı + uyarı bandı |
| `a8e197c` | T4 | Detay ekranı (`/hakedisler/taseron/[paymentId]`) |
| `769c237` | — | **OLAY:** SD diliminin openapi devri yanlış dala indi (bkz. aşağıdaki "Olay notu") |
| `e1b6359` | T5 | Şantiye sekmesine taşeron sütunu + brüt kar marjı gerçek verisi |
| `d771b59` | T5 fix | Taşeron satır alt-etiketine bölüm bileşeni render |
| `4757acb` | T6 | e2e fonksiyonel (8 test) + 4 görsel spec dosyası |
| `6f950c4` | — | `origin/main` dala merge (openapi devri + schema senkronu, rebase değil) |
| `4274e1a` | T6 fix (post-merge) | Taşeron satır input tipini `-Input` şema varyantına taşıma (openapi ayrışması düzeltmesi) |

4 yeni rota: `/hakedisler/taseron` · `/hakedisler/taseron/yeni` · `/hakedisler/taseron/[paymentId]` ·
`/hakedisler/taseron/[paymentId]/duzenle`; `/hakedisler` artık "İşveren \| Taşeron" sekmeli.

Testler (HEAD `4274e1a` itibarıyla, `pnpm test` ile doğrulandı): **191 dosya / 1613 test**, hepsi yeşil.
Playwright: 1 fonksiyonel spec (`e2e/subcontractor-progress-payments.spec.ts`, 8/8 yerelde yeşil) + 4
görsel spec (3 yeni + `site-progress-payments-visual.spec.ts` güncellendi) — hepsi yalnız son
`toHaveScreenshot` adımında beklenen şekilde başarısız (macOS'ta baseline yok/üretilmiyor, proje kuralı).

## ONAYLI SAPMALAR (mockup'tan bilinçli ayrılmalar — sapma diye geri alınmaz)

1. **Rozet renk eşlemesi** 2026-08-03'te tekleştirildi: Onaylandı=yeşil, Ödendi=mavi (mockup seti
   tutarsızdı; kullanıcı kararı, T2 ledger notu). İşveren ekranları da bu renklere geçti
   (`shared/status.ts` TEK renk kaynağı, `PROGRESS_PAYMENT_STATUS_BADGE` buna delege eder).
2. **Teminat Kesintisi satırı** form tfoot'una ve detay ödeme hesabına EKLENDİ (mockup'ta yok) —
   `shared/payment-calculation-rows.ts`, brief'in isteği.
3. **Fiyat farkı katsayısı** form başlığında basılıyor (mockup'ta yok) — taşeron sözleşmesinde
   `has_price_escalation` alanı olmadığı için işverenin kilit/toggle deseni değil, sade her-zaman-düzenlenebilir
   alan (işveren formu deseninin uyarlanmış hali).
4. **Liste "Net = Brüt − KDV" hesabı BASILMADI**; backend'in `net_total` alanı doğrudan basılıyor
   (mockup L146'daki hesap istemci tarafında tekrarlanmıyor — mockup'ın kendi hesabı hatalı).
5. **Form "Dönem" alanı** tek select değil, ay-Select + yıl-Input (işveren formunun yerleşik deseni;
   mockup'ta tek select).
6. **Create kipinde tfoot yapısı ve yüzde etiketleri basılıyor ama TUTARLAR ilk kayda kadar "—"** —
   backend'in `calculation` bloğu create yanıtında yok; ikinci bir hesap motoru istemci tarafında yazmak
   brief'te yasaklandı.
7. **Detay kalem tablosu 6 kolon** (işverende 5) — taşeron satır şeması (`SubcontractorProgressPaymentLine`)
   işverenle birebir eşleşmiyor, ek kolon şemadan geliyor.
8. **Dönem filtresine mockup'ta olmayan "Tüm Dönemler" seçeneği eklendi** — URL-state sıfırlama gereği
   (filtre temizlenince URL'de dönem parametresi tutarlı bir "hiçbiri" değerine dönmeli).

## DEVRE-DIŞI basılan mockup öğeleri (güncellendi — final inceleme F-1/F-7)

> **KALICI KURAL (kullanıcı kararı, 2026-08-03):** backend'i / rotası olmayan mockup öğesi **SİLİNMEZ**;
> devre-dışı + görünür Türkçe gerekçeyle **BASILIR**. "Basılmaz" yalnız kullanıcının açıkça verdiği
> kapsam-dışı kararlarında geçerlidir. Bu bölümün önceki hâli ("BASILMAYAN mockup öğeleri") bu kuralla
> geçersizleşti.

- **"Sözleşmeyi Gör →"** (form hiyerarşi şeridi, mockup O41) — hedef rota (Taşeron Sözleşme Detay,
  P5-frontend dilimi) bu repoda hâlâ yok → mockup'taki yerinde basılır, `aria-disabled="true"` +
  `title="Taşeron sözleşme detay ekranı henüz eklenmedi"`, gerçek `href` YOK (tıklanınca hiçbir yere
  gitmez).
- **Form breadcrumb'ındaki taşeron adı + sözleşme no** (mockup O19) — aynı gerekçe, aynı desen.
- **Create kipinde sıra numarası** (mockup O21 "Hakediş #48 Oluştur") — şemada create öncesi `sequence_no`
  yok → sayı yerine pending gösterge (`#—` + `title="Sıra numarası ilk kayıtta backend tarafından
  verilir."`); öğe izsiz kaybolmaz.

Üçü de test ile kapsandı (`SubcontractorProgressPaymentForm.test.tsx` — "hiyerarşi şeridi ve devre-dışı
sözleşme bağlantısı").

## KALICI PENDING alanlar (backend gerekçeleriyle)

- **Liste:** iş kategorisi (work_category) · KDV tutarı · ilerleme yüzdesi —
  `SubcontractorProgressPaymentListItem` şeması bu alanları hiç taşımıyor.
- **Detay:** "Toplam Hakediş"/"Kalan" KPI'ları + "Sözleşme İlerlemesi" üç çubuğu —
  `SubcontractorContractDetail.progress_payment_summary` şemada her zaman `null`.
- **Şantiye satırı:** bölüm ADI — yalnız `section_id` dönüyor, adı çözecek bir uç yok (yalnız bileşen tipi
  gösterilebiliyor, bkz. T5 fix `d771b59`).
- **Detay:** PDF/dışa aktarma — böyle bir uç yok; buton BASILIYOR ama devre dışı + gerekçeli
  (yukarıdaki kalıcı kuralın zaten uygulanmış hâli).

Ek olarak iki mimari-düzey pending (ROADMAP-FRONTEND.md §3'e işlendi):
- Sözleşme seçim adımı hakedişlerden türetiliyor (`useSubcontractorContractOptions`); `GET
  /subcontractor-contracts` liste ucu (TB2) gelince bu hook'un içi değiştirilecek.
- Şantiye taşeron süzmesi istemci tarafında (`useSiteSubcontractorPayments`); TB2'nin `site_id` filtresiyle
  sunucuya taşınacak.

## OLAY NOTU (kullanıcı istedi)

SD diliminin openapi devri (`769c237`) yanlış dala (bu dala) indi. Kullanıcı planı uygulandı (rebase yok):
main'e geçilip `769c237` cherry-pick edildi, `pnpm gen:api` çalıştırıldı, kapılar doğrulandı, openapi+schema
tek commit olarak main'e push'landı (main'deki karşılığı `45cf16b`). Ardından bu dala dönülüp `origin/main`
dala MERGE edildi (rebase değil) — merge commit `6f950c4` — sonucunda PR diff'inden 8351 satırlık openapi
düştü (yalnız bu dilimin gerçek değişiklikleri PR'da görünür).

**Devrin ADDİTİVE OLMADIĞI ortaya çıktı:** backend artık `ProgressPaymentLineInput` ve
`SubcontractorProgressPaymentLineInput` şemalarını `-Input`/`-Output` olarak İKİYE ayırıp üretiyor; düz ad
(eksiz) KALKTI. Üç referans `-Input` varyantına taşındı: main tarafında `useProgressPaymentMutations.ts` +
`schema.test.ts` (main'de `45cf16b` ile düzeltildi), bu dalda `useSubcontractorProgressPaymentMutations.ts:22`
(commit `4274e1a`). Bu, kalıcı bir tuzak olarak `ARCHITECTURE-FRONTEND.md`'ye işlendi: istek gövdesi üreten
kod `-Input` varyantını kullanmalı, düz adın var olduğu varsayılmamalı.

## BASELINE TURU (Linux'ta yapılacak — kullanıcıda)

- **YENİ** (hiç yok, ilk kez üretilecek): `taseron-hakedisleri-listesi` · `taseron-hakedis-detay-onay-bekliyor`
  · `taseron-sozlesme-secim-adimi` · `taseron-hakedis-olustur-formu`
- **KESİN YENİLENECEK** (içerik kanıtlanmış şekilde değişti): `santiye-hakedisler` (T5, taşeron KPI'ları +
  panel gerçek verilerle doldu + T5 fix'in bölüm alt-etiketi) · `hakedisler-listesi` (T2, `ProgressPaymentsTabs`
  artık kadrajda, `fullPage: true` çekiyor — T6 raporunun kaçırdığı, koordinatör incelemesinde bulundu)
- **ŞÜPHELİ** (Linux'ta diff'lenmeli, "etkilenmedi" diye VARSAYILMAYACAK): `hakedis-detay-onay-bekliyor` —
  `d5df22c` rozet renklerini (approved/paid) tersine çevirdi; bu ekranın sabit kaydı `pending_approval`
  durumunda olduğu için kadrajda approved/paid rozeti görünmeyebilir, ama bu kod okumasına dayanıyor,
  gerçek piksel karşılaştırması Linux CI'da yapılmalı.

## Kapı çıktıları (bu T7 dilimi, `4274e1a` HEAD üzerinde — ürün kodu değişmedi)

- `pnpm lint` → `✔ No ESLint warnings or errors`
- `pnpm typecheck` → temiz (çıktı yok, exit 0)
- `pnpm test` → `Test Files 191 passed (191)` · `Tests 1613 passed (1613)`
- `pnpm build` → başarılı (tüm yeni rotalar dahil derlendi)

(Ayrıntı için aşağıdaki "T7 kapı çalıştırma kanıtı" bölümüne bakın.)

## T7'de yapılan doküman işleri

1. `docs/superpowers/plans/2026-08-03-f-th-taseron-hakedis-ekranlari.md` — untracked dosya bu dilimde
   commit'e alındı (bu dilimin planı, spec zaten commit'liydi).
2. `../ARCHITECTURE-FRONTEND.md` (repo kökünün BİR ÜSTÜ, düz dosya, frontend repo'sunun DIŞINDA — bu repo
   git deposu değil, dolayısıyla bu düzenleme frontend'in commit'ine DAHİL DEĞİL, yalnız düzenlendi) —
   4 yeni rota, 3 yeni BFF kökü, 4 yeni hook, ortaklaştırılan `shared/` parçaları, openapi `-Input`/`-Output`
   ayrışması kalıcı tuzağı, test sayıları, kabuk responsive borcu eklendi.
3. `../ROADMAP-FRONTEND.md` (aynı konum/durum) — F-P7'den devreden taşeron pending satırları kapatıldı,
   §3'e brief'in istediği üç madde + baseline turu + kabuk responsive borcu eklendi, F-TH "🔵 bitti, doğrulama
   bekliyor" olarak §1'e işlendi (henüz canlı DEĞİL, merge/deploy bekliyor — ✅ canlıda tablosuna KONULMADI).
4. Bu kapanış raporu.

## Brief'teki listelerde düzelttiğim/netleştirdiğim noktalar

- Brief'in §3 talimatı doğrudan "ROADMAP §3'e şu üç satır eklenir" diyordu; ben bunları tek tek satır olarak
  ekledim ama ayrıca §1'deki "✅ canlıda" tablosuna F-TH'yi YERLEŞTİRMEDİM — çünkü bu dal main'e merge
  edilmedi/deploy edilmedi (progress.md ve task-6-report.md hiçbir yerde "canlıda" demiyor, tam tersine
  "sıradaki adımlar: push/PR/merge/deploy" diyor). Bunun yerine yeni bir "🔵 bitti, doğrulama bekliyor"
  alt-başlığı açtım (ROADMAP'in kendi lejantında zaten bu sembol tanımlı). Brief bunu açıkça istemedi ama
  "canlıda" tablosuna yanlış bilgi yazmamak için gerekli gördüm — icat değil, mevcut lejantın doğru kullanımı.
- "~26/95 mockup yapıldı" satırını da bu yüzden "~26/95 CANLIDA + 3 F-TH kodlandı (merge bekliyor, ~29/95)"
  olarak güncelledim, düz "~29/95" yazmadım (henüz canlı değil).
- Diğer tüm liste maddeleri (onaylı sapmalar, kalıcı pending, ölü link, kapı sonuçları, baseline listesi)
  brief'te verildiği gibi, `progress.md` + `task-1..6-report.md` ile çapraz doğrulanarak BİREBİR kullanıldı;
  çelişki bulunmadı.

## Sonraki adımlar (kullanıcıda)

1. Dalı push et: `git push -u origin feat/f-th-taseron-hakedis`.
2. `visual-baselines.yml` GitHub Actions workflow'unu Linux'ta çalıştır (yukarıdaki baseline listesi).
3. PR aç, incele, main'e merge et.
4. Railway auto-deploy'u doğrula; canlıda `/hakedisler/taseron/*` akışlarını manuel doğrula (T7 bu adımı
   YAPMADI — brief'in kapsamı doküman + kapı doğrulaması, canlı doğrulama değil).

## Şüpheler

- `ARCHITECTURE-FRONTEND.md`/`ROADMAP-FRONTEND.md` frontend repo'sunun DIŞINDA, düz dosya olarak düzenlendi;
  bu iki dosyadaki değişiklikler bu commit'e DAHİL DEĞİL (repo sınırları dışında, git ile izlenmiyor) —
  kullanıcı bunları ayrıca görmeli/onaylamalı.
- Bu T7 diliminde ürün kodu hiç değişmedi; kapı sonuçları T6'nın bıraktığı HEAD (`4274e1a`) üzerinde
  yeniden koşulup doğrulandı, aradaki hiçbir şey değişmediği için sayılar T6 raporuyla birebir aynı çıktı
  (bu beklenen, regresyon değil).
