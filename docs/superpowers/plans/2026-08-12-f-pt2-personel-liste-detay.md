# F-PT2 — Personel liste + detay (frontend plan)

Tarih: 2026-08-12 · Spec: `../specs/2026-08-12-f-pt2-personel-liste-detay-design.md` (ONAYLI) ·
Dal: `feat/f-pt2-personel` — **F-ST MERGE OLDUKTAN SONRA güncel main'den** (önce açma!) ·
Task başına TEK subagent, her task sonunda commit.

## T1 — Altyapı
BFF `personnel` kökü grep doğrulaması (yeni kök YOK) · hook'lar (`usePersonnelList` süzgeçli ·
`usePersonnel(id)` · PATCH mutasyonu) · e2e mock genişletmesi (şemayla senkron — F-P5 dersi;
F-ST'nin salt-okur fikstür tuzağına dikkat: personel yazma testleri kendi fikstürünü izole kurar).

## T2 — `/personel` liste
Spec §1/P birebir: sekme şeridi (yalnız Puantaj gerçek) · uyarı bandı pending · KPI (3 türev +
3 pending) · filtreler (q/meslek/durum gerçek; proje pending) · tablo (K1: SGK/Ücret/Proje sütunları
pending hücreli) · Detay linki · sayfalama · "+ Personel Ekle" `?donus=` · "Dışa Aktar" devre-dışı.
Nav href guard testi (sidebar "Personel" gerçek rotaya).

## T3 — `/personel/[id]` detay + düzenleme kipi
Başlık kartı (gerçek: ad/rozetler/meslek; kalanlar pending) · 4 pending kart (Puantaj Özeti ·
İzin & Haklar · Proje Geçmişi · Belgeler) görünür gerekçeli · "Bordroyu Gör" devre-dışı ·
**"Düzenle" → mevcut personel formu düzenleme kipi** (PATCH; F-P6 iki-kip emsali; pending alanlar
aynı; gövde anahtar testi — pending alan SIZMAZ).

## T4 — Görsel + TEK PAKET kapanış + FINAL REVIEW (Opus)
3 görsel spec (`personel-liste` · `personel-detay` · `personel-liste-bos`; kanonik `prepareFrame`) ·
beş kapı · review odağı: pending sızıntısı · uydurma değer (KPI/tarih) taraması · mock-şema senkronu.
Sonra WORKFLOW §2 ⚡ TEK PAKET: koşullar (kapılar+CI yeşil · baseline'da yalnız beklenen fark
[3 yeni PNG + değişmesi beklenen YOK] · origin/main head değişmemiş) TUTUYORSA push→PR→CI→merge
(--merge)→deploy doğrula→canlı smoke (spec §3; smoke'ta değiştirilen meslek GERİ ALINIR)→
ROADMAP/ARCHITECTURE güncelle→TEK rapor. Koşul tutmazsa DUR+rapor.
