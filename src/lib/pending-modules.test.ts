import { describe, it, expect } from "vitest";

import { MODULE_LABELS, pendingModuleLabel } from "./pending-modules";

/**
 * 🔴 F-UNIT1 T5 · METİNLER TOPLUCA DÜZELTİLDİ. Eski iddialar "<Modül>
 * modülüyle birlikte gelir" metnini KİLİTLİYORDU; o kalıp artık YALANDIR —
 * modüllerin neredeyse hepsi arada geldi (`/hakedisler` · `/faturalar` ·
 * `/puantaj` · `/sozlesmeler` · `/satis` · `/is-kalemleri` · `/stok` ·
 * `/belgeler` · `/makine` · `/satinalma` · `/gunluk-kayit`).
 *
 * İddialar SİLİNMEDİ, YENİ GERÇEĞE TAŞINDI (F-MU2 kanonu): her anahtar hâlâ
 * eşleniyor mu diye sınanır, yalnız beklenen metin değişti.
 */
describe("pendingModuleLabel", () => {
  it("F6 anahtarlarini esler", () => {
    expect(pendingModuleLabel("progress_payments")).toBe(
      "Hakediş verisi bu yüzeye henüz bağlanmadı",
    );
    expect(pendingModuleLabel("invoicing")).toBe("Fatura verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("inventory")).toBe("Risk listesi henüz hiçbir uçtan hesaplanmıyor");
  });

  // 🔴 P-YT2 (2026-08-23, backend merge `a843ecd`) · BU İDDİA YİNE KIRILDI —
  // ama bu kez ÇÖZÜLME yönünde. Bir önceki tur (F-OK T6) metni "panel
  // bağlanmadı"ya çevirmişti; ÖLÇÜLDÜ, backend artık `available=True` +
  // gerçek `count` döndürüyor ve kart bu veriye bağlandı. Metin artık eksik
  // bir bağlantı VAAT ETMİYOR, sayının KAYNAĞINI (Onay Kutusu ekranı)
  // adlandırıyor — anahtar "modül yok" istisnası değil, KAYNAK ETİKETİ.
  it("approvals metni DEGISTI - panel BAGLANDI, metin artik KAYNAK etiketi", () => {
    expect(pendingModuleLabel("approvals")).toBe("Onay verisi Onay Kutusu ekranından gelir");
  });

  it("P1 anahtarlarini esler", () => {
    expect(pendingModuleLabel("timesheet")).toBe("Puantaj verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("subcontracts")).toBe(
      "Taşeron sözleşmesi verisi bu yüzeye henüz bağlanmadı",
    );
    expect(pendingModuleLabel("units")).toBe("Ünite verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("project_costs")).toBe("Maliyet verisi bu yüzeye henüz bağlanmadı");
  });

  it("P2 anahtarlarini esler", () => {
    expect(pendingModuleLabel("contracts")).toBe("Sözleşme verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("boq")).toBe("İş kalemi verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("stock")).toBe("Stok verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("documents")).toBe("Belge verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("equipment")).toBe("Makine verisi bu yüzeye henüz bağlanmadı");
  });

  // 🔴 F-UNIT1 T5'te KALDIRILDI (`gantt` / `income_statement` / `section_boq`
  // emsali): ÖLÇÜLDÜ — backend `site_diary`yi HİÇBİR yerde `pending_module`
  // olarak yayınlamıyor (yalnız izin matrisi anahtarı) ve frontend'de de onu
  // okuyan kimse yok (bölüm detayı F-BOLLINK'te `section_site_diary`ye geçti).
  // Yedek metne düşmesi, eşlenmemiş olmasının kanıtıdır.
  it("site_diary anahtari ARTIK YOK - okuyani da yayinlayani da kalmadi", () => {
    expect(pendingModuleLabel("site_diary")).toBe("İlgili modülle birlikte gelir");
  });

  // 🔴 Üçü de LİSTE UCUNUN taşımadığı alanlardır, bir yetenek eksikliği DEĞİL:
  // KDV hakediş formunda hesaplanıyor, ilerleme hakediş detayında gösteriliyor.
  it("F-TH T2 anahtarlarini esler (liste ucu eksikligi, modul degil)", () => {
    expect(pendingModuleLabel("work_category")).toBe("İş kategorisi liste ucundan gelmiyor");
    expect(pendingModuleLabel("vat")).toBe("KDV liste ucundan gelmiyor (hakediş formunda hesaplanır)");
    expect(pendingModuleLabel("progress")).toBe(
      "İlerleme liste ucundan gelmiyor (hakediş detayında gösterilir)",
    );
  });

  it("F-TH T5 fix round 1 anahtarini esler (bolum adi cozumlemesi)", () => {
    expect(pendingModuleLabel("section_name")).toBe(
      "Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)",
    );
  });

  // F-ST T3: canli sunucunun stok anahtarlari (`inventory/service.py`).
  it("F-ST anahtarlarini esler (purchasing + site_planning)", () => {
    expect(pendingModuleLabel("purchasing")).toBe("Satınalma verisi bu yüzeye henüz bağlanmadı");
    expect(pendingModuleLabel("site_planning")).toBe(
      "Şantiye planlama verisi bu yüzeye henüz bağlanmadı",
    );
  });

  // `procurement` canlı sunucudan HİÇ gelmez (backend `purchasing` yayınlar) ama
  // F-ST T3 kararıyla eşli kalır; iki anahtar AYNI metni verir.
  it("procurement ve purchasing AYNI metni verir", () => {
    expect(pendingModuleLabel("procurement")).toBe(pendingModuleLabel("purchasing"));
  });

  // 🔴 F-BOLLINK: bölüm detayına özel anahtarlar. Metin "modül yok" DEMEZ —
  // beş modülün de şantiye seviyesinde yazılı rotası var, eksik olan bölüm bağı.
  // 🔴 BOQ-SEC-F GÖÇÜ: `section_boq` listeden ÇIKARILDI — o bağ artık AÇIK,
  // sekme gerçek tablo basıyor. Anahtarın YOKLUĞU ayrıca çakılır (aşağıda).
  it("F-BOLLINK bolum anahtarlarini esler ve 'modulle birlikte gelir' DEMEZ", () => {
    const keys = [
      "section_timesheet",
      "section_stock",
      "section_progress_payments",
      "section_site_diary",
    ];
    for (const key of keys) {
      const label = pendingModuleLabel(key);
      expect(label).not.toBe("İlgili modülle birlikte gelir");
      expect(label).not.toMatch(/modülüyle birlikte gelir/);
    }
  });

  // BOQ-SEC-F bekçisi: anahtar geri gelirse birileri canlı sekmeye yeniden
  // "henüz bağlanamıyor" gerekçesi bağlamış demektir — bu test o çürümeyi
  // yakalar. (Yedek metne düşmesi, eşlenmemiş olmasının kanıtıdır.)
  it("section_boq anahtari ARTIK YOK - bolum bagi acildi", () => {
    expect(pendingModuleLabel("section_boq")).toBe("İlgili modülle birlikte gelir");
  });

  // 🔴 F-PKK T1 · Proje Özeti (KY/KK) + Paylaşım Tablosu (KKP) ekranlarının
  // mockup'ta ÇİZİLİ olup üründe KARŞILIĞI OLMAYAN yüzeyleri. Beşi de bir
  // MODÜL eksikliği DEĞİL, ALAN/UÇ eksikliğidir — metinler bunu söyler.
  it("F-PKK anahtarlarini esler (alan/uc eksikligi, modul degil)", () => {
    expect(pendingModuleLabel("construction_progress")).toBe(
      "İnşaat ilerlemesi hesaplanmıyor (hakediş yüzdesi proje düzeyine toplanmıyor)",
    );
    expect(pendingModuleLabel("project_cash_position")).toBe(
      "Proje nakit durumu hiçbir uçtan gelmiyor (maliyet ucu nakit taşımaz)",
    );
    expect(pendingModuleLabel("sales_breakeven")).toBe(
      "Başabaş noktası hesaplanmıyor (maliyet ucu eşik ünite sayısı döndürmüyor)",
    );
    expect(pendingModuleLabel("landowner_delivery_tracking")).toBe(
      "Arsa sahibi teslim takibi hiçbir uçtan gelmiyor (kat karşılığı özeti teslim adımı taşımaz)",
    );
    expect(pendingModuleLabel("subcontractor_contract_status")).toBe(
      "Sözleşme durumu maliyet satırından gelmiyor",
    );
  });

  // 🔴 F-PKK T1 · EMRİN ALTINCI ANAHTARI ÖLÇÜLDÜ VE ÇÜRÜTÜLDÜ. KK 161-163
  // hissedar başına "10 ünite" basar ve emir bunu `shareholder_unit_count`
  // gerekçesiyle devre dışı bırakmamı istiyordu. Kaynak VARDIR:
  // `LandShareShareholderRow` (`GET /projects/{id}/land-share/summary` →
  // `shareholders[]`) `unit_count` VE `value_total` taşır ve o ucun hook'u
  // canlıdır (`useLandShareSummary`). Yalnız `ProjectDetailResponse
  // .land_share.shareholders` (`ShareholderResponse`) sayıyı taşımaz — ekran
  // ÖZET ucunu okur. Anahtar EKLENMEZ: eklenirse ekran gerçek veriyi
  // bastırıp YALAN bir gerekçe basardı (`section_boq` emsali).
  it("shareholder_unit_count anahtari EKLENMEDI - kaynak land-share/summary'de VAR", () => {
    expect(pendingModuleLabel("shareholder_unit_count")).toBe("İlgili modülle birlikte gelir");
  });

  // 🔴 F-PKK T2 · ÖNCEDEN KAYIT EDİLMİŞ BORÇ. `FALLBACK_LABEL`in kendi notu bu
  // iki anahtarı isim isim sayıp "o ekran yazıldığında BURAYA eklenmelidir,
  // aksi hâlde kullanıcı genel metni görür" diyordu. Ekran BU dilimde yazıldı.
  // Backend eşlemesi (`projects/cost_summary.py:154-156`): permits→accounting ·
  // financing→treasury · marketing→accounting.
  it("accounting ve treasury artik GENEL YEDEGE DUSMEZ (F-PKK borcu odendi)", () => {
    const fallback = pendingModuleLabel("__eslenmemis_anahtar__");

    expect(pendingModuleLabel("accounting")).not.toBe(fallback);
    expect(pendingModuleLabel("treasury")).not.toBe(fallback);
    expect(pendingModuleLabel("accounting")).toBe(
      "Muhasebe verisi bu yüzeye henüz bağlanmadı (gider hesapları projeye kırılmıyor)",
    );
    expect(pendingModuleLabel("treasury")).toBe(
      "Hazine verisi bu yüzeye henüz bağlanmadı (kredi ve faiz projeye kırılmıyor)",
    );
  });

  // İkisi de MODÜL eksikliği DEĞİL: `/muhasebe` ve `/hazine` CANLI. Metin
  // "modül yok" derse bayat kalıba geri düşmüş oluruz (F-UNIT1 T5 dersi).
  it("iki yeni metin de bayat 'modulyle birlikte gelir' kalibini KULLANMAZ", () => {
    for (const key of ["accounting", "treasury"]) {
      expect(pendingModuleLabel(key), `"${key}" bayat kalıba düştü`).not.toMatch(
        /modülle birlikte gelir|modülüyle birlikte gelir/,
      );
    }
  });

  it("bilinmeyen anahtarda genel metin doner", () => {
    expect(pendingModuleLabel("bilinmeyen")).toBe("İlgili modülle birlikte gelir");
  });

  // P10 devri: `app__modules__projects__schemas__MetricPlaceholder.pending_module`
  // artik `string | null` (ve zorunlu degil). Anahtar yoksa da genel metne dusulur.
  it("null/undefined anahtarda genel metne duser", () => {
    expect(pendingModuleLabel(null)).toBe("İlgili modülle birlikte gelir");
    expect(pendingModuleLabel(undefined)).toBe("İlgili modülle birlikte gelir");
  });
});

/**
 * 🔴 F-UNIT1 T5 · ÇÜRÜME BEKÇİSİ (anahtar başına iddiadan DAHA GÜÇLÜ).
 *
 * Yukarıdaki iddialar YALNIZ bugün bilinen anahtarları sınar; yarın eklenen
 * bayat metinli bir anahtar hepsini yeşil bırakırdı. Bu blok haritanın
 * TAMAMINI tarar ve "<Modül> modülüyle birlikte gelir" kalıbını YASAKLAR —
 * bu turda düzeltilen tam olarak o kalıptı.
 */
describe("MODULE_LABELS — bayat 'modül gelecek' kalıbı yasağı", () => {
  // 🔴 F-OK T6 (2026-08-23) — istisna KAPANDI: `/onay-kutusu` bu dilimde
  // yazıldı ve `approvals` metni "… birlikte gelir" kalıbından "… henüz
  // bağlanmadı" kalıbına döndü. 🔴 P-YT2 (2026-08-23, backend merge `a843ecd`)
  // — metin BİR TUR DAHA değişti: kart artık gerçek `count`a bağlı, "…
  // ekranından gelir" bir KAYNAK ETİKETİ. Hiçbiri "… birlikte gelir" kalıbına
  // dönmedi (bkz. pending-modules.ts), dolayısıyla küme hâlâ BOŞ kalır. Bir
  // gün gerçekten yazılmamış bir modül için "… birlikte gelir" gerekçeli bir
  // anahtar eklenirse buraya da EKLENİR; sessizce boş bırakılmaz.
  const ALLOWED_MODULE_PROMISES = new Set<string>([]);

  // ⚠️ Tek tek `expect` YAZILMAZ: ilk başarısızlıkta test durur ve geri kalan
  // ihlaller GÖRÜNMEZ olur (bu turda tam olarak öyle oldu — üç ihlal ardı
  // ardına ortaya çıktı). İhlaller TOPLANIR, tek iddiada basılır.
  it("hicbir metin '… modülüyle birlikte gelir' demez", () => {
    const offenders = Object.entries(MODULE_LABELS)
      .filter(([, label]) => /modülüyle birlikte gelir/.test(label))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("'birlikte gelir' vaadi yalniz gercekten yazilmamis modulde kalir", () => {
    const offenders = Object.entries(MODULE_LABELS)
      .filter(([key, label]) => /birlikte gelir/.test(label) && !ALLOWED_MODULE_PROMISES.has(key))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("her anahtarin metni bos degildir", () => {
    for (const [key, label] of Object.entries(MODULE_LABELS)) {
      expect(label.length, `"${key}" boş`).toBeGreaterThan(0);
    }
  });
});
