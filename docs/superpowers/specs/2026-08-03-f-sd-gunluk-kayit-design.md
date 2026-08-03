# F-SD — Şantiye Günlüğü Ekranları (frontend spec)

Tarih: 2026-08-03 · Durum: **ONAYLANDI (2026-08-03)** — §6'nın BEŞ sorusu da önerildiği gibi onaylandı:
S1 Hakediş Özeti modu BU dilimde · S2 Planlama ekranı AYRI dilim (F-PL; mod anahtarında devre-dışı+gerekçe) ·
S3 iki buton (Taslak Kaydet + Kaydet & Gönder) + admin Yeniden Aç · S4 trend grafiği pending kart
(zaman-serisi ucu backend borç adayı) · S5 "Günlükten Doldur" butonları BU dilimde.
Mockup'lar: `Şantiye - Günlük Kayıt.dc.html` (GK — kanonik) · `Ekran 7 - Şantiye Günlüğü Girişi.dc.html`
(E7 — eski sürüm; Taslak Kaydet + Şantiye Şefi Notu buradan) · `Şantiye - Hakediş Özeti.dc.html` (HÖ — §6 S1).
Backend: SD CANLIDA (11 uç) · PL merge yolunda (day-summary ucu dahil) · işveren+taşeron hakediş canlı.
Üst kural: **mockup'ta ne varsa birebir basılır**; backend'i olmayan parça devre-dışı/pending, gövdeye sızmaz.
⚠️ Mockup tarihleri GERÇEK TAKVİMLE UYUŞMUYOR (ör. "21-27 Temmuz 2026" haftası, 17 Tem 2026) — tarihler
birebir KOPYALANMAZ; bugün/gerçek takvim kullanılır (PL şefinin uyarısı; sadakat metin/yapı içindir).

## 1. Rotalar (drill sekmesi `gunluk-kayit` zaten nav'da; mod anahtarı üç görünüm)
| Rota | Görünüm |
|---|---|
| `.../santiyeler/[siteId]/gunluk-kayit` | **Kayıt Gir** (GK formu — varsayılan mod) |
| `.../gunluk-kayit/ozet` | **Hakediş Özeti** (HÖ — §6 S1) |
| Planlama modu | LİNK → Planlama ekranı (§6 S2: ayrı dilim F-PL; rota gelene kadar devre-dışı+gerekçe) |
**BFF: `diary` kökü İLK İŞ** (eksikse 4 uç yalnız canlıda 404 — bilinen tuzak; `sites` kökü zaten var).

## 2. Kayıt Gir (GK + E7 birleşimi)
- Temel bilgiler: tarih (varsayılan bugün) · hava (5'li enum) · sıcaklık · Bölüm seçici (GK198).
- **İş Kalemi Girişi (GK205-266):** BOQ pozlarından satır iskeleti (POST otomatik getiriyor) · yalnız
  "Bugün Yapılan" girilebilir · Kümülatif `yapılan/sözleşme` + Hakediş ₺ türevleri yanıttan · tfoot
  "Bugünkü Hakediş Katkısı" · "Sözleşme BOQ'a bağlı" rozeti · bilgi kutusu (GK261-265, "Hakediş
  Durumu →" linki `/hakedisler`'e).
- Yapılan İşler textarea (GK271) + **Şantiye Şefi Notu** (E7 143 — `chief_note` backend'de var, basılır).
- **Fotoğraflar kartı (GK274-318):** pending — belge çekirdeği kararı; kart görünür, yükleme devre-dışı
  + gerekçe (üst kural: silinmez).
- **Gömülü Planlama bloğu (GK321-348):** PL kararı gereği SALT-OKUNUR türev — `GET .../plan/day-summary`
  (5 gün); giriş kontrolleri BASILMAZ (onaylı sapma, PL spec S2) + "Planlama'ya git" linki (§6 S2'ye göre).
- Sağ panel: Son Kayıtlar (liste ucundan; durum rozeti `submitted`="Gönderildi"; hava=rainy günde
  "Yağışlı" kırmızı rozet — frontend türevi) · Aylık Hakediş Birikimi kartı (işveren+taşeron
  summary'lerinden, F-TH kar-türev deseni; kırpılmada pending) · Bugünkü İşçi Dağılımı (worker_counts,
  Şirket/Taşeron/Genel rozetleri, toplam türev) · İSG kartı (3 checkbox + olay notu).
- **Aksiyonlar (§6 S3):** E7'de iki buton (Taslak Kaydet + Gönder), GK'de tek "Kaydet & Gönder" —
  backend iki ayrı uç sunuyor (PATCH/PUT yalnız draft; submit ayrı). Önerim: **iki buton** (E7 deseni;
  GK'nin tek butonu bileşikti). Ayrıca submitted kayıtta admin'e "Yeniden Aç" (reopen) butonu.
- Günde tek kayıt: aynı güne ikinci POST 409 → Türkçe mesaj + var olan kayda yönlendirme.

## 3. Hakediş Özeti modu (HÖ; §6 S1 onaylıysa)
- Ay gezinme `‹ Temmuz 2026 ›` → tüm veriler o aya filtreli.
- 4 KPI: İşveren Hakediş (o ay — işveren listesinden period süzmesi) · Taşeron Ödemeleri (U2 listesi,
  site+period) · Brüt Kar (türev; kırpılmada pending — F-TH korkuluğu) · Kümülatif (işveren summary).
- "İş Kalemi Bazlı Hakediş Birikimi" tablosu: `GET /sites/{id}/diary/summary?year&month` (poz bazlı
  aylık toplamlar; yalnız submitted).
- Karlılık paneli + taşeron kırılımı (U2'den) · "Hakediş Oluştur →" → `/hakedisler/yeni?project=`.
- Aylık trend grafiği (HÖ234-258): backend zaman-serisi ucu YOK → §6 S4.

## 4. "Günlükten Doldur" butonları (§6 S5)
İşveren hakediş formuna + taşeron hakediş formuna "Günlükten Doldur" aksiyonu: `diary-suggestion`
uçlarını çağırır, önerilen miktarları forma doldurur (kullanıcı düzeltebilir — SD Seçenek B'nin UI ayağı);
taşeron satırında "📅 Günlük kayıttan" rozeti `quantity_source`'tan (öneri uygulandıysa görünür).

## 5. Teknik
Hook'lar: diary liste/detay/create/patch/lines/submit/reopen/summary + plan day-summary + suggestion'lar.
`gen:api` durumu: PL devri çalışma ağacında (110 yol) — dilim başında frontend main'de tek commit devri
(kural). Görsel spec'ler: kayıt-gir + özet modu (+ form dolu/boş durumları). 5. kapı zorunlu.
Mock-backend'e diary+plan uçları. Tüm kontroller `ui/` primitive; `getByRole("alert")` yasak.

## 6. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Hakediş Özeti modu bu dilimde mi?** Backend'i artık tam (diary summary + iki hakediş listesi
  canlı). Önerim: **evet** — F-P7'den beri bekleyen ekran kapansın.
- **S2 — Planlama modu linki:** Planlama EKRANI ayrı dilim (F-PL, ızgara+hedefler — PL backend'i merge
  yolunda). Bu dilimde mod anahtarındaki "Planlama" devre-dışı+gerekçe mi, yoksa F-PL'yi de bu dilime
  mi katalım? Önerim: **ayrı dilim** (F-SD zaten büyük).
- **S3 — Aksiyon butonları:** iki buton (Taslak Kaydet + Kaydet & Gönder — E7 deseni; GK tek butonu
  bileşik sayılır) + admin'e Yeniden Aç. Onay?
- **S4 — Aylık trend grafiği (HÖ):** zaman-serisi ucu yok → devre-dışı/pending kart mı (üst kural),
  yoksa frontend son N ayın listelerinden mi türetsin? Önerim: **pending kart** (N ay × 2 liste çağrısı
  pahalı; backend'e ileride küçük seri ucu — borç adayı).
- **S5 — "Günlükten Doldur" butonları** (işveren+taşeron formlarına dokunuş) bu dilimde mi? Önerim:
  **evet** — SD'nin B kararının görünür değeri bu.
