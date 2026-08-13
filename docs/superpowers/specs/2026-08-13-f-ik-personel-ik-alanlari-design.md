# F-İK — Personel İK Alanları + Belge Sekmesi (frontend) · TASARIM

Tarih: 2026-08-13 · Repo: frontend · Yönetim oturumu yazdı (⚡ düzen, WORKFLOW §2)
Mockup otoritesi: `projedesign/Personel.dc.html` (**P**, 249) · `Personel Detay.dc.html`
(**PD**, 147) · `Form - Personel Ekle.dc.html` (**PE**, 219)
Backend: **İK-1 + İK-2 CANLIDA** (142 yol).

---

## 0. Bu dilim NE DEĞİLDİR

`/personel` liste ve `/personel/[id]` detay ekranları **F-PT2'de (2026-08-12) YAPILDI ve CANLIDA.**
O dilim yapıldığında İK-1 backend'i yoktu; bu yüzden kimlik/iletişim/ücret/SGK/IBAN alanları ve
proje süzgeci **dürüstçe "pending" basıldı** (uydurma veri yerine görünür boşluk — doğru karardı).

**Bu dilim o pending yüzeyleri GERÇEK veriyle doldurur.** Ekranlar sıfırdan yazılmaz, mevcut
bileşenler genişletilir. F-PT2 spec'i (`2026-08-12-f-pt2-personel-liste-detay-design.md`) **okunur**;
oradaki kararlar (sütun silmeme, zarif düşüş, sekme devre-dışılığı) korunur.

---

## 1. Kapsam

**İÇERİDE:**
1. **openapi devri** (canlı 142 yol) + `pnpm gen:api` + BFF kök denetimi.
2. **Liste (P):** `SGK` · `Ücret/Gün` · `Proje` sütunları pending'den **GERÇEĞE**; **proje süzgeci
   gerçek olur** (`assigned_project_id` İK-1'de açıldı — F-PT2'de "backend süzgeci yok" diye pending'di).
3. **Detay (PD):** telefon · e-posta · şehir/adres · SGK No · IBAN · günlük ücret · işe giriş
   pending'den **GERÇEĞE**.
4. **Form (PE, `/personel/yeni` + düzenleme):** İK-1'in 14 kart alanı + taslak/yayın ayrımı + TCKN.
5. **Belge & Sertifika sekmesi:** yeni yüzey — `GET /hr/documents/summary` + personel belge
   alt-kaynağı (`/personnel/{id}/documents`).

**DIŞARIDA:**
- **İzin Yönetimi sekmesi — 🔴 MOCKUP YOK.** İK-2 backend spec'i `İK - İzin Yönetimi.dc.html`'e
  (İZ, 176) satır satır atıf veriyor ama dosya `projedesign/` içinde **YOKTUR** (tüm proje arandı,
  git geçmişinde de yok). WORKFLOW §3: mockup gelene kadar o parça BEKLER. Sekme **devre-dışı +
  görünür gerekçeyle** kalır (F-PT2'deki hâli); izin uçlarına **hiç dokunulmaz**.
- **Bordro + SGK sekmeleri:** İK-3 backend'i henüz canlıda değil → devre-dışı + gerekçe sürer.
- **PD'nin bordro bloğu** ("Bu Ay Net ₺19.336", aylık geçmiş) → İK-3'e pending kalır.
- **Vergi No** (PD 30) → İK-1 bu alanı bilerek açmadı → pending kalır, **forma eklenmez**.
- Fotoğraf yükleme (BC form-slot borcu) · personel silme yüzeyi (yıkıcı uç, ayrı karar).

---

## 2. Bağlanan kararlar

**K1 · Pending→gerçek geçişi ALAN ALAN kanıtlanır.** Her doldurulan alan için, sunucunun o alanı
gerçekten döndüğü telden doğrulanır. **Şemada olmayan alanı "gerçek" sanıp basmak yasak** — F-PT2'nin
pending kararları veri yokluğundan doğmuştu, hepsi aynı anda çözülmedi (vergi no hâlâ yok).

**K2 · `worker_source` DÖRT değere dayanıklı yazılır.** Backend'de İK-3 dalı enum'a `freelance` +
`intern` ekliyor (henüz merge edilmedi). Rozet/etiket haritaları **bilinmeyen değere karşı dayanıklı**
olur: eşleşmeyen değer ekranı çökertmez, "—" düşer. Etiketler hazır tutulur: **"Serbest"** / **"Stajyer"**
(BY 253 · BY 281). Bu, İK-3 canlıya çıkınca ekranın kendiliğinden doğru davranmasını sağlar.

**K3 · TCKN doğrulaması SUNUCUDADIR.** İstemci checksum hesaplamaz; 422 (geçersiz) ve 409 (çift kayıt)
yanıtlarını **ayrı ve anlamlı** gösterir. İki hatayı tek mesaja indirmek kullanıcıyı yanıltır.

**K4 · Taslak/yayın ayrımı korunur** (İK-1 sunucu kuralı): taslak zorunlulukları gevşetir, yayın
PE'nin `*` kümesini zorlar. İstemci **kendi zorunluluk listesini icat etmez** — sunucunun reddettiğini
gösterir; ama PE'de `*` taşıyan alanlar formda görsel olarak işaretlenir.

**K5 · IBAN maskeleme mockup'tandır** (PD 34 `TR12 0001 0093...`), istemci uydurması değil. Tam değer
düzenleme formunda görünür.

**K6 · Belge sekmesi sunucu sözleşmesini TÜKETİR.** 5 KPI + tip dağılımı + süresi dolan/yaklaşan
listeleri sunucudan gelir; **istemci KPI hesaplamaz**. `missing` tanımı sunucunundur (yalnız
aktif+yayında personel, zorunlu tip başına) — ekran onu yeniden yorumlamaz, olduğu gibi gösterir.

---

## 3. Zorunlu korkuluklar

1. **openapi devri T1'de** — WORKFLOW §4 "Ortak" devir kuralı: kopya + `gen:api` **tek commit**.
2. **BFF TUZAĞI:** `personnel` kökü var (F-PT2). **`hr` kökü (`/hr/documents/summary`) BÜYÜK
   OLASILIKLA YOK** → `ALLOWED_ROOTS`'a eklenir + **adlı kapı testi**. Grep'le doğrula, varsayma —
   eklenmezse belge sekmesi yalnız CANLIDA 404 verir.
3. **Pending kalan her alan görünür gerekçe taşır** (vergi no · bordro bloğu · izin/bordro/SGK sekmeleri).
4. **Devre-dışı sekmeler tıklanamaz ve rota üretmez** — koruma testi (F-P8 emsali).
5. **Görsel spec kuralı (WORKFLOW §4, DÖRT parça):** `prepareFrame` kanonu · durum-tabanlı iddia ·
   sabit `waitForTimeout` YASAK · kesirli konumlanan yüzey tam piksele yuvarlanır.
   ⚠️ **Bu dilim mevcut ekranları değiştirdiği için baseline'lar DEĞİŞECEK** — beklenen fark; ama
   farkın yalnız dolan alanlarda olduğu **ölçülerek** kanıtlanır (F-P8 dersi: sidebar'a dokunulmadıysa
   sidebar'lı kareler oynamamalı).
6. Ham `<select>/<input>/<label>` YASAK → `ui/` primitive'leri. Çıplak hex/px YASAK → `tokens.css`.
   **`as any` / `@ts-ignore` YASAK — test dosyaları dâhil** (F-SA dersi).
7. **E2E mock kurucuları şemadan anotasyonlanır** (F-SA dersi) — mock↔şema kayması typecheck'te görünsün.

---

## 4. Bilinçli sınırlar

- İzin/Bordro/SGK sekmeleri bu dilimde **veri göstermez**; devre-dışı + gerekçe.
- Kişi-bazlı puantaj özeti ucu backend'de YOK (F-PT2'nin borç adayı) → "Puantaj Özeti" kartı pending kalır.
- Personel silme yüzeyi basılmaz.
