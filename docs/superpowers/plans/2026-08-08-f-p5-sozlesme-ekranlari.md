# F-P5 — Sözleşme Ekranları (uygulama planı)

Spec: `../specs/2026-08-08-f-p5-sozlesme-ekranlari-design.md` · Ön şart: spec §7 sorularının cevabı.
Dal: `feat/f-p5-sozlesmeler` (main'den) · YENİ oturum önerilir · Her task = tek subagent + commit ·
Kapılar + DOM'da 5. kapı · ARA REVIEW YOK (WORKFLOW §2). En büyük frontend dilimi — 8 task.

## T1 — Devir + TB3 takibi + altyapı
TB3 openapi devri (backend main'den taze; main'de TEK commit + `gen:api` + kapılar) · U1 join söküm
(`work_category` listeden) · seçim adımına `total` korkuluğu · hook'lar · e2e mock uçları
(distribution BİRLEŞTİRME semantiği mock'ta da) · BFF kökleri grep teyidi (yeni kök beklenmiyor).

## T2 — SZL liste (sekmeli) — `/sozlesmeler`
4 KPI + tablo + İşveren|Taşeron sekmeleri + taşeron sekmesinde "Taşeron Firmaları →" girişi +
"+ Yeni Sözleşme" (S2 kararı). Satır → detay linkleri.

## T3 — E14 işveren detay + sekmeler
Başlık + 5 metrik + Hakediş Özeti + Milestone PENDING + PDF devre-dışı + S3 koşul satırları ·
İş Kalemleri sekmesi (gruplar + distributed/remaining) · Hakedişler sekmesi (F-P7 paylaşımı) ·
Belgeler sekmesi PENDING kartı · "Düzenle" → proje formu linki.

## T4 — POZ dağılım ızgarası
Dinamik şantiye kolonları + kirli-hücre kaydetme (boşaltılan=null; 0 asla; dokunulmamış gönderilmez —
BİRLEŞTİRME testi: kaydetten sonra dokunulmamış kota sunucuda durur, KANIT) + Kalan rozetleri +
dağıtılmamış uyarı bandı + şantiye özet kartları (birim istemci join'i) + 422 Türkçe.

## T5 — TL firma listesi + taşeron modalı
İstemci agregasyonu (3 kaynak) + kırpılmada para-pending + Puan "—"+gerekçe (S4) + kategori rozetleri +
"+ Taşeron Ekle" modalı (create) — modal FSO içinden de kullanılır (paylaşılan).

## T6 — FSO taşeron formu — `/sozlesmeler/taseron/yeni`
5 kart birebir · load-from-employer akışı + created/skipped bildirimi · items_missing_price uyarısı ·
belge kutuları PENDING · taslak/oluştur · doğrulamalar (zorunlular, oran 0-100, maxLength).

## T7 — TSD taşeron detay
Başlık (VKN ek çağrı) + zincir + poz tablosu (yalnız B.F. yazılabilir, PATCH) + tfoot=contract_total
(çelişki kararı) + Hakediş % türevi + Hakediş Geçmişi + S3 Şartlar bölümü (düzenlenebilir PATCH) +
"+ Hakediş Oluştur" önseçili + PDF devre-dışı. **F-TH'nin "Sözleşmeyi Gör" linkleri AKTİFLEŞİR**
(devre-dışı hâl + title kaldırılır — kanıt final review'de).

## T8 — Test + görsel + FINAL REVIEW (Opus)
Vitest (birleştirme gövde kurulumu, agregasyon+pending dalları, form doğrulama) + fonksiyonel e2e +
görsel spec'ler (SZL 2 sekme · E14 · POZ · TL · FSO · TSD — WORKFLOW görsel spec kuralına uygun).
Review: satır-numaralı sadakat · BİRLEŞTİRME kanıtı · S3 bölümlerinin gövde disiplini · "Sözleşmeyi
Gör" aktifleşme kanıtı · her rotaya görünür giriş · kapılar + build. ARCHITECTURE+ROADMAP güncelle,
commit. Push/PR/baseline/merge kullanıcıda.
