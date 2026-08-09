# F-BC — Belge Arşivi ekranları (frontend plan)

Tarih: 2026-08-09 · Spec: `../specs/2026-08-09-f-bc-belge-arsivi-design.md` (ONAYLI) ·
Dal: `feat/f-bc-belge-arsivi` (GÜNCEL main'den — `bcaef6c` fix merge'i dahil olmalı) ·
Task başına TEK subagent, her task sonunda commit.

## T1 — Devir + altyapı
- **openapi devri (WORKFLOW §4):** frontend main'de ve temiz doğrula → backend main'de `openapi.json`
  TAZE üret (bayat kopya tuzağı!) → kopyala → `pnpm gen:api` → openapi+schema TEK commit.
  P10 merge olduysa şeması birlikte iner; olmadıysa 116 yol. P9 kırıcısı (`UnitResponse.shareholder`
  kalktı) typecheck'te görülür — tüketen UI yok, temiz geçmeli; kırık çıkarsa DUR, rapor.
- **BFF:** `ALLOWED_ROOTS`a `documents` + `document-folders` (route.ts) + İKİ adlı kapı testi.
- **Flake sertleştirmesi (onaylı ek kapsam):** `planlama-izgara` spec'indeki kapsamsız locator'lara
  `.first()`/kap kapsamı (akış-SSR çift kopya sınıfı).
- Hook katmanı: `useDocumentFolders(projectId, siteId?)` · `useDocuments(projectId, {siteId?, folderId?, q?})` ·
  yükleme/klasör mutasyonları · e2e mock'a documents/document-folders üreticileri.

## T2 — ŞB ekranı (`.../santiyeler/[siteId]/belgeler`)
- Drill sekme "Belgeler" aktifleşir (ComingSoon'dan çıkar). Klasör paneli + kart grid + "Son
  Eklenenler" listesi (İndir butonlu) — spec §2 satır gerekçeli.
- `site_id` HER istekte; ikili indirme `Content-Disposition` korunarak (BFF Content-Type dalı).
- Boş durumlar; `documents:view/full` izin kapıları (yazma butonları izinsiz gizli/devre-dışı,
  emsal desen hangisiyse o).

## T3 — Yükleme + yeni klasör diyalogları (S1 onaylı türetilmiş etkileşim)
- Yükle: dosya seç + hedef klasör (aktif varsayılan) + isteğe bağlı açıklama → multipart POST
  (BFF geçirme testi) · 413/422 Türkçe görünür hata · başarıda liste tazelenir.
- Yeni klasör: tek ad alanı → POST · 409 ad çakışması görünür mesaj.
- ui/ primitive'leriyle (ham kontrol yasak). İki ekran da aynı diyalogları paylaşır.

## T4 — E12 ekranı (`/belgeler`)
- Kabuk içinde iki panel; kökler = görünür projeler (S4), proje seçimi → klasörler + proje-düzeyi
  belgeler (`site_id` GEÇİLMEZ). Breadcrumb metni + başlık + kart grid + Son Eklenenler + dashed
  yükleme kartı. Kart tıklaması = indirme (S1). Arama `?q=`.
- Sidebar "Belge Arşivi" öğesi aktif rotaya bağlanır (nav href guard testi — F-TH dersi).

## T5 — Görsel spec'ler + kapanış + FINAL REVIEW (Opus)
- 4 görsel spec: `belgeler-genel` (E12 dolu) · `belgeler-genel-bos` · `santiye-belgeler` (ŞB grid+liste) ·
  `belge-yukle-diyalog` (tıklama+fullPage ise scroll-sıfırlama kuralı ZORUNLU).
- Beş kapı + review odağı: BASILMAYANLAR sızıntı taraması (belge sil düğmesi · klasör rename/sil ·
  form kartı dokunuşu · versiyon/onay yüzeyi = bulgu) · site_id kapsam doğruluğu (E12'de sızıntı =
  bulgu) · mock'un şema alanlarıyla senkronu (F-P5 baseline dersi).
- `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md` güncelle (BC-2 borç adayı satırı dahil), commit.
- Push/PR/baseline turu/merge/deploy kullanıcı onayıyla (rapor et, bekle).
