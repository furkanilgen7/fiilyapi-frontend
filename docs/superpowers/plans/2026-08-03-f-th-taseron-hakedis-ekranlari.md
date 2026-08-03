# F-TH — Taşeron Hakedişi Ekranları (uygulama planı)

Spec: `../specs/2026-08-03-f-th-taseron-hakedis-ekranlari-design.md` · Ön şart: spec §6 sorularının
kullanıcı cevabı. Dal: `feat/f-th-taseron-hakedis` (frontend main'den — openapi 91-yol devri main'de).
Her task = tek subagent + commit · Kapılar her task'ta: `pnpm lint`+`typecheck`+`test`.

## T1 — Altyapı
- BFF `ALLOWED_ROOTS`'a `subcontractor-progress-payments` + `subcontractor-contracts` + `subcontractors`
  (grep doğrulaması + route testi). `gen:api` GEREKMEZ (schema.d.ts güncel) — `schema.test.ts`'e taşeron
  şema varlık assert'leri eklenebilir.
- Hook'lar: liste/summary/detay/create/update/lines/5 durum aksiyonu/refresh-prices + sözleşme listesi.
- e2e mock-backend'e TH uçları (sequence sözleşme-kapsamlı, is_revision_required, quantity_source dahil).
- F-P7 ile paylaşılacak parçaların çıkarımı (rozet eşleme, para format, durum buton seti) — kopya kod yasak.

## T2 — Taşeron listesi (Ekran 2) + rota yerleşimi (S3 kararına göre)
- 4 KPI + filtreler (proje/dönem/durum/arama; URL state) + 8 kolon tablo + durum/Revize Gerekli rozetleri.
- Mockup satır-numaralı sadakat; %18 yerine %20 etiketi; net = backend hesabı (L146 hatası basılmaz).
- İşveren listesiyle sekme entegrasyonu (S3); işveren tarafının görsel baseline'ı etkilenirse
  "yenilenecekler" listesine.

## T3 — Oluştur/düzenle formu (O)
- Sözleşme seçim adımı (F-P7 proje-seçim emsali) → hiyerarşi şeridi + üst form + Bölüm seçici (section_id)
  + kalem tablosu (yalnız Bu Ay Miktar girilebilir) + tfoot (teminat satırı DAHİL — onaylı sapma) +
  katsayı başlıkta + Taslak Kaydet/Onaya Gönder.
- `PUT lines` DEĞİŞTİRME semantiği (tüm satırlar gönderilir); 409/422 Türkçe; `quantity_source`
  rozet altyapısı (bu dilimde hep "Elle giriş").
- Kural: ham kontrol yasak (`ui/` primitive), token CSS, `maxLength`.

## T4 — Detay ekranı (S1 kararına göre) + durum aksiyonları
- Ekran 15'in taşeron uyarlaması: KPI + kalem/grup tablosu + ödeme hesabı (teminat satırlı) + başlıkta
  durum-bazlı buton seti (reject gerekçeli modal) + draft'ta Düzenle linki (F-P7 "ölü yüzey" dersi:
  her rotaya giden görünür giriş olduğu final review'de KANITLANIR).

## T5 — Şantiye sekmesi + kar türevleri (S2 kararına göre)
- Taşeron sütunu gerçek veri; "Toplam Taşeron Ödemesi" KPI gerçek; kar/marj S2 kararına göre
  (frontend türeviyse tek yardımcı fonksiyonda, testli; pending ise mevcut desen sürer).

## T6 — Test + görsel
- Vitest (hook'lar, rozet/para, form doğrulama, revize-gerekli türevi) + e2e fonksiyonel + görsel
  spec'ler (liste/detay/form/şantiye sekmesi). Mutasyona uğrayan mock kayıtları kadrajdan uzak tut
  (P7 dersi). macOS'ta PNG üretilmez.

## T7 — FINAL REVIEW (Opus)
- Satır-numaralı mockup sadakat taraması (üst kural: eksik öğe = bulgu) · her rotaya görünür giriş
  kanıtı · BFF kökleri grep · paylaşım-vs-kopya denetimi · kapılar + build.
- `ARCHITECTURE-FRONTEND.md` (rotalar/BFF/hook'lar) + `ROADMAP-FRONTEND.md` (P7'den devreden taşeron
  pending satırlarının kapanışı) güncellenir, commit. Push/PR/merge/deploy + baseline turu kullanıcıda.
