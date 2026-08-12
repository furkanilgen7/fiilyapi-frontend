# F-PT2 — Personel liste + detay (frontend spec)

Tarih: 2026-08-12 · Durum: **ONAYLANDI (2026-08-12 — hızlandırılmış düzen: sorular yönetimce
mockup+kanonla bağlandı; para/veri-kaybı sınıfı karar YOK)**
Mockup: `Personel.dc.html` (**P**, 249) · `Personel Detay.dc.html` (**PD**, 147).
Backend: PT `personnel` uçları CANLIDA (liste `?q=`+süzgeçler · POST · GET/PATCH `{id}`; DELETE YOK).
⚠️ PT kayıtlı gerçekleri: kimlik/iletişim/ücret/SGK alanları sözleşmede YOK · proje süzgeci YOK ·
kişi-bazlı puantaj özeti ucu YOK. Bu dilim İK DEĞİL — İK alanları dürüst pending.

## 1. Kapsam

- **P — `/personel` liste** (ComingSoon'dan çıkar; sidebar zaten işaret ediyor): 6'lı sekme şeridi
  (P 70-77): "Personel Listesi" aktif · **"Puantaj" GERÇEK link** (`/puantaj`) · İzin/Belge/Bordro/SGK
  rotasız → devre-dışı+gerekçe (kalıcı kural). Uyarı bandı (80-86) İK-Belge'ye pending. KPI şeridi
  (89-114): Toplam/Şirket/Taşeron listeden TÜREV; "Sahada Aktif"/"İzinde"/"Aylık Maliyet" pending
  zarf görünümü. Filtreler (117-125): arama `?q=` + meslek + durum GERÇEK; **proje süzgeci pending
  devre-dışı** (backend süzgeci yok — teste yazılı karar). Tablo (132-232): Ad(+işe giriş alt satırı —
  §4 K6) · Tür rozeti (`worker_source`: Şirket/Taşeron/Genel) · Meslek · Durum rozeti GERÇEK;
  **SGK · Ücret/Gün · Proje sütunları basılır, hücreler pending "—"** (zarif düşüş — sütun silinmez).
  "Detay" → `/personel/[id]`. Sayfalama backend parametresine göre (yoksa istemci). "+ Personel Ekle"
  → mevcut `/personel/yeni` (`?donus=/personel`). "Dışa Aktar" devre-dışı+gerekçe (uç yok).
- **PD — `/personel/[id]` detay**: başlık kartı (ad · Aktif/Tür rozetleri · meslek GERÇEK; telefon/
  e-posta/şehir/SGK/vergi/IBAN/ücret/Bu-Ay-Net **pending** — PD 40-62) · **Puantaj Özeti kartı
  pending** (kişi-bazlı uç yok — ROADMAP'e backend borç adayı; "Tümü →" `/puantaj` gerçek link) ·
  İzin & Haklar + Proje Geçmişi kartları **pending** (İK dilimi) · Belgeler kartı **pending**
  (BC-2 form-slot; "+ Ekle"/"İndir" basılır-devre-dışı) · "Bordroyu Gör" devre-dışı ·
  **"Düzenle" GERÇEK**: mevcut Personel formu DÜZENLEME KİPİ kazanır (PATCH ucu var; F-P6 iki-kip
  emsali — create'teki pending alanlar aynı pending kalır, `is_active` düzenlenebilir).

## 2. Kurallar

Pending desen: F-PT kararı 5 aynen (devre-dışı + görünür gerekçe; gövdeye SIZMAZ — anahtar testi).
`worker_source=general` rozeti "Genel" (`diary-labels` yeniden kullanımı — F-PT kararı). PD'nin
kendi üst barı basılmaz (kabuk canon); breadcrumb kabuktan. Boş liste/boş arama sade Türkçe
boş-durum. BFF: `personnel` kökü ZATEN açık (F-PT) — grep'le doğrula, yeni kök GEREKMEZ.

## 3. Test/kapanış

Görsel spec'ler: `personel-liste` · `personel-detay` · `personel-liste-bos` (kanonik `prepareFrame`).
Beş kapı. Kapanış TEK PAKET (WORKFLOW §2 ⚡ — koşullu yetki emirde gömülü). Smoke: liste→detay→
düzenle (meslek değiştir→kaydet→doğrula→GERİ AL)→sıfır kalıntı.

## 4. Yönetimin bağladığı kararlar (2026-08-12)

K1 SGK/Ücret/Proje sütunları basılır + hücre pending (sütun silinmez — kalıcı kural) · K2 "Düzenle"
= mevcut formun düzenleme kipi (yeni ekran İCAT EDİLMEZ) · K3 sekmelerden yalnız Puantaj gerçek ·
K4 kişi-bazlı puantaj özeti backend borç adayı (bu dilimde uç İSTENMEZ) · K5 "Dışa Aktar" devre-dışı
(uç yok; İK diliminde) · K6 P 147 "İşe giriş" alt satırı: backend alanı varsa basılır, yoksa alt
satır atlanır (uydurma tarih basılmaz).
