# F-PT — Puantaj Ekranları (uygulama planı)

Spec: `../specs/2026-08-07-f-pt-puantaj-design.md` · Ön şart: spec §6 sorularının kullanıcı cevabı.
Dal: `feat/f-pt-puantaj` (main'den) · YENİ oturum önerilir · Her task = tek subagent + commit ·
Kapılar + DOM değişiminde 5. kapı · **ARA REVIEW YOK** (WORKFLOW §2) · `openapi/openapi.json`'a
DOKUNULMAZ (TB3 paralel; devir TB3-sonrası dilime).

## T1 — Altyapı
- BFF `ALLOWED_ROOTS`'a **`personnel`** (grep + route testi); `sites` kökü teyidi (timesheet uçları orada).
- Hook'lar: personnel liste/create + timesheet GET/PUT + export indirme.
- e2e mock-backend'e PT uçları — **PUT kapsam kuralı mock'ta da uygulanır** (eksik hücre = silme).

## T2 — Matris çekirdeği (paylaşılan bileşen) + iki rota
- E5 (`/puantaj`: şantiye seçicili) + ŞP (şantiye sekmesi: Tür rozeti, bölüm filtresi, özet şeridi).
- Ay gezinme (gerçek takvim) · kod rozetleri (5'li set) · tfoot türevleri (`4+`, `3G`, adam-gün).
- Satır-numaralı sadakat; E5/ŞP farkları (Meslek kolonu vs alt satır) birebir.
- İzin görünümleri: saha müh. salt-okunur (Kaydet devre-dışı+gerekçe) · PM AccessDenied.

## T3 — Hücre etkileşimi + kaydetme (S1 kararına göre)
- Popover (5 kod + Temizle; FM'de opsiyonel saat alanı) — matrisin görsel dilinden.
- **Kaydet: bölüm filtresi aktifken bile TAM şantiye kümesi gönderilir** — birim testi + e2e ile
  KANITLANIR (filtreli görünümde kaydet → diğer bölüm hücresi silinmedi).
- 409 (kişi başka şantiyede) Türkçe mesaj · Excel indirme.

## T4 — Personel yüzeyi (S2a onaylıysa)
- `/personel/yeni` FP formu (mockup birebir; foto+belge alanları PENDING devre-dışı; backend'de
  karşılıksız alanlar devre-dışı+gerekçe, gövdeye sızmaz) · puantaj ekranlarında `personnel:full`
  izinliye "Personel Ekle" girişi · boş-durum yönlendirmesi. `/personel` nav girdisi ComingSoon KALIR.

## T5 — Test + görsel
- Vitest (kapsam kuralı, popover, izin dalları, 409) + fonksiyonel e2e + görsel spec'ler (E5 + ŞP +
  popover + form). Mock kayıtları kadrajdan uzak · `getByRole("alert")` + SSR çift-kopya yasak ·
  macOS'ta PNG üretme.

## T6 — FINAL REVIEW (Opus)
- Satır-numaralı sadakat (eksik öğe = bulgu) · **PUT kapsam kanıtı** (en kritik) · türetilmiş
  kontrollerin "sırıtma testi" · her rotaya görünür giriş · BFF grep · kapılar + build.
- `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md` güncellenir, commit. Push/PR/baseline/merge kullanıcıda.
