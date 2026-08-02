# P7 — İşveren Hakedişi Ekranları (frontend spec)

Tarih: 2026-08-02 · Durum: **ONAYLANDI (2026-08-02)** — §6'nın TÜM soruları önerildiği gibi onaylandı:
S1 Ekran 15 başlığına durum-bazlı buton seti (approve/reject/mark-paid/unapprove; ayrı mockup gelmeyecek) ·
S2 PDF butonu bu dilimde basılmaz · S3 FF/endeks sözleşmeden salt-okunur (`contracts` BFF kökü açılır) ·
S4 şantiye sekmesi proje-düzeyi liste · S5 Hakediş Özeti ekranı bu dilimden ÇIKARILDI (site_diary dilimine) ·
S6 liste tutarı brüt (`gross_total`).
Mockup'lar: `Ekran 15 - İşveren Hakedişi` · `İşveren Hakediş Oluştur` · `Şantiye - Hakedişler` · `Şantiye - Hakediş Özeti`
Backend sözleşmesi: `progress_payments` şemaları (13 uç, canlıda) + backend spec 2026-07-31 §10/4.

## 1. Rota planı
| Rota | Ekran / mockup | Not |
|---|---|---|
| `/hakedisler` | Liste (Şantiye-Hakedişler'in işveren yarısının proje-genel hali) | nav'da var, bugün ComingSoon |
| `/hakedisler/[paymentId]` | Ekran 15 — detay | KPI + grup tablosu + ödeme hesabı + ilerleme |
| `/hakedisler/yeni` (+`?project=`) | İşveren Hakediş Oluştur | taslak oluştur/düzenle aynı form (`/hakedisler/[id]/duzenle`) |
| `/projeler/[pid]/santiyeler/[sid]/hakedisler` | Şantiye - Hakedişler sekmesi | drill sidebar "Hakedişler"; **aynı kaydın iki görünümü** (kalıcı karar) |
| Hakediş Özeti | — | **§6 S5: bu dilimden çıkarılması önerilir** |

## 2. Alan eşlemesi — birebir VAR olanlar (mockup satır → şema alanı)
- Detay: `#5`→`sequence_no` · dönem→`period_year/month` · rozet→`status` · KPI'lar→`calculation.gross`,
  `Summary.cumulative_gross`, `Summary.remaining` · grup tablosu (İş Kalemi/Sözleşme/Önceki/Bu Ay/Toplam)
  →`groups[]` (group_name/contract_amount/previous_amount/this_amount/cumulative_amount) · Ödeme Hesabı
  →`calculation` (gross/vat/advance_deduction/retention/net) + oran etiketleri `vat_pct/advance_pct/retainage_pct`
  · İlerleme→`progress` (financial/physical/duration_pct).
- Oluştur: dönem select→`period_year/month` · katsayı→`default_coefficient` (rozet=(k−1)%) · tablo
  satırları→`lines[]` (code/description/unit/contract_unit_price/coefficient/adjusted_unit_price/
  quantity/line_total/group_name) · şantiye kolonları = `site_id` bazlı satırların pivotu ·
  tfoot→`calculation` · Taslak Kaydet→POST/PATCH · Onaya Gönder→`submit`.
- Liste: `#N — dönem`→sequence+period · açıklama→`description` · rozet→status · tutar→**§6 S6**.

## 3. Kritik semantikler (uygulayıcı için bağlayıcı)
- **`PUT /progress-payments/{id}/lines` DEĞİŞTİRMEDİR** — gövdede geçmeyen satır SİLİNİR; `0` miktar meşru.
  (P5 poz dağılımı birleştirmesinin TERSİ.) Pivot UI kaydederken TÜM satırları gönderir.
- `refresh-prices` yalnız taslakta; `is_price_stale=true` satırda "bayat fiyat" uyarısı gösterilir.
- Aynı sözleşmede draft/pending varken yeni hakediş → 409; Türkçe mesajla kullanıcıya.
- Kota aşımı 422 (yalnız artışta); azaltma/0 serbest. Kuruş hassasiyeti; mockup'ın tam-lira görünümü artefakt.
- İzin: liste/detay `view` · form `draft` · durum aksiyonları `approve` · silme admin+taslak.
- BFF: `progress-payments` kökü `ALLOWED_ROOTS`'a; sözleşme bağlamı okunacaksa (`§6 S3`) `contracts` kökü de.

## 4. pending-modules ile boş kalanlar (ara çözüm YAZILMAZ)
Kar Analizi kartı (taşeron ödemeleri/brüt kar/marj) → taşeron hakedişi · "Günlük kayıtlardan hesaplandı"
etiketi → site_diary · Şantiye-Hakedişler'in taşeron sütunu + KPI'ları → taşeron hakedişi ·
liste satırındaki "%62 ilerleme" → liste şemasında yok (gösterilmez).

## 5. Mockup'ta OLMAYIP backend'de olanlar (UI kararı gerekli)
`reject` (gerekçeli) · `approve` · `mark-paid` · `unapprove` · `draft` rozeti · `dropped_orphan_count`
uyarısı. → **§6 S1**.

## 6. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Onay aksiyonları mockup'sız:** approve/reject/mark-paid/unapprove butonlarının yeri hiçbir
  mockup'ta yok (Ekran 15'te yalnız "Onaya Gönder"). WORKFLOW kuralı gereği **mockup istiyorum** —
  ya da "Ekran 15 başlık aksiyon alanına durum-bazlı buton seti" tasarımına onay ver (Onay Kutusu
  ekranı ayrı dilim).
- **S2 — PDF butonu (Ekran 15):** backend'de export ucu YOK. Önerim: buton bu dilimde basılmaz, ayrı dilim.
- **S3 — Fiyat Farkı toggle + Endeks select:** endeks bilgisi sözleşmede (`project_contracts.index_type`,
  `has_price_escalation`) — hakediş ucunda alan yok. Önerim: banner sözleşmeden SALT-OKUNUR gösterilir
  (contracts BFF kökü açılır), toggle kapatmak = katsayıyı 1'e çekmek. Onaylıyor musun?
- **S4 — Şantiye sekmesi kapsamı:** liste ucu şantiye filtresi desteklemiyor; sekme proje-düzeyi listeyi
  gösterir ("aynı kaydın iki görünümü" kararına uygun). Onay?
- **S5 — Hakediş Özeti ekranı:** 2/3'ü site_diary+taşerona bağlı, ay-filtreli özet ucu da yok.
  Önerim: **bu dilimden çıkar**, site_diary dilimiyle gelsin. Onay?
- **S6 — Liste tutarı:** `gross_total` mı `net_total` mı gösterilsin? Önerim: gross (KPI'larla tutarlı).
