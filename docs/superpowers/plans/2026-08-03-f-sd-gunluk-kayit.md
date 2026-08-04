# F-SD — Şantiye Günlüğü Ekranları (uygulama planı)

Spec: `../specs/2026-08-03-f-sd-gunluk-kayit-design.md` · Ön şart: spec §6 sorularının kullanıcı cevabı
+ **PL backend'inin merge+deploy edilmiş olması** (day-summary ucu canlı olmalı).
Dal: `feat/f-sd-gunluk-kayit` (frontend main'den) · **YENİ OTURUM önerilir** (önceki şef oturumu doldu).
Her task = tek subagent + commit · Kapılar her task'ta: lint+typecheck+test; DOM değişiminde 5. kapı ·
**ARA REVIEW YOK** (WORKFLOW §2).

## T1 — Devir + altyapı
- Çalışma ağacındaki PL devri (110 yol / 160 operasyon) main'de TEK commit: openapi + `pnpm gen:api` +
  kapılar. (`-Input/-Output` ayrışması çıkarsa taşı.)
- BFF `ALLOWED_ROOTS`'a **`diary`** kökü (grep + route testi). `sites` kökü zaten var (plan/timesheet
  uçları oradan geçiyor) — teyit.
- Hook'lar: diary CRUD/lines/submit/reopen/summary + plan day-summary + iki diary-suggestion.
- e2e mock-backend'e diary + plan uçları (taslak-dışı kurallar mock'ta da).

## T2 — Kayıt Gir ekranı (GK formu)
- Rota + mod anahtarı (Kayıt Gir aktif; Planlama S2'ye göre; Özet S1'e göre).
- Temel bilgiler + İş Kalemi Girişi tablosu (yalnız "Bugün Yapılan" girilebilir; türevler yanıttan) +
  Yapılan İşler + Şef Notu + İSG + fotoğraf kartı (pending, devre-dışı+gerekçe) + gömülü planlama
  bloğu (day-summary'den SALT-OKUNUR + link).
- Aksiyonlar S3 kararına göre; 409 → Türkçe mesaj + mevcut kayda yönlendirme; izin: `site_diary`
  (PM salt-okur — form devre-dışı görünümü).

## T3 — Sağ panel
- Son Kayıtlar (rozet türevleri: Gönderildi / hava=rainy → "Yağışlı") · Aylık Hakediş Birikimi
  (işveren+taşeron türev karı; kırpılmada pending) · İşçi Dağılımı (worker_counts) — hepsi gerçek veri.

## T4 — Hakediş Özeti modu (S1 onaylıysa)
- Ay gezinme + 4 KPI + poz-bazlı birikim tablosu (diary summary) + karlılık paneli + taşeron kırılımı +
  "Hakediş Oluştur →" · trend grafiği S4 kararına göre.

## T5 — "Günlükten Doldur" (S5 onaylıysa)
- İşveren + taşeron hakediş formlarına buton: diary-suggestion çağır → satırları doldur (kullanıcı
  düzeltebilir) → kaydet normal `PUT lines`. Taşeron satırında `quantity_source` rozeti. Mevcut form
  testleri + yeni akış testleri; iki formun görsel baseline'ları "yenilenecekler" listesine.

## T6 — Test + görsel
- Vitest (hook'lar, türevler, 409, izin dalları) + fonksiyonel e2e + görsel spec'ler (kayıt-gir,
  özet modu, form durumları). Mock kayıtları kadrajdan uzak (P7 dersi); `getByRole("alert")` yasak.
  macOS'ta PNG üretilmez.

## T7 — FINAL REVIEW (Opus)
- Satır-numaralı sadakat (üst kural; tarih artefaktı istisnası spec başlığında) · her rotaya görünür
  giriş · BFF grep · pending kartlardan gövdeye sızıntı yok kanıtı · kapılar + build.
- `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md` (Hakediş Özeti kapsam-dışı notunun kapanışı dahil)
  güncellenir, commit. Push/PR/baseline turu/merge kararları kullanıcıda.
