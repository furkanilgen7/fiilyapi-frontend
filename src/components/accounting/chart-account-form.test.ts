import { describe, expect, it } from "vitest";

import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";

import {
  ACCOUNT_TYPE_OPTIONS,
  ACCOUNT_TYPE_PLACEHOLDER,
  ACCOUNT_TYPE_SIGN,
  CHART_ACCOUNT_CODE_PATTERN,
  CHART_ACCOUNT_FORM_BLOCKERS,
  CONTRA_HELP,
  chartAccountFormBlockers,
  chartAccountFormOf,
  changedChartAccountFields,
  emptyChartAccountForm,
  kontraOnizleme,
  type ChartAccountFormState,
} from "./chart-account-form";
import type { ChartAccountType } from "@/lib/api/hooks/useChartOfAccounts";

const ACCOUNT: ChartAccountResponse = {
  id: "acc-100",
  code: "100",
  name: "Kasa",
  account_type: "asset",
  is_active: true,
  is_contra: false,
  balance: "284800.00",
  class_code: "1",
  level: 2,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

/**
 * 🔴 K6 — FİKSTÜR KÖRLÜĞÜNÜ KAPATAN İKİNCİ HESAP. Bu dosyadaki bütün
 * fikstürler `is_contra: false`tı; yani "testler yeşil" cümlesi kontra
 * hesaplar hakkında HİÇBİR ŞEY söylemiyordu. `ACCOUNT` olduğu gibi DURUR,
 * bu onun YANINA konur (mevcut iddialar ona dayanıyor).
 *
 * Kanon: `backend/app/modules/accounting/balance_sheet.py:159-180` —
 * `257` `liability` + `is_contra = True`.
 */
const KONTRA_ACCOUNT: ChartAccountResponse = {
  ...ACCOUNT,
  id: "acc-257",
  code: "257",
  name: "Birikmiş Amortismanlar (-)",
  account_type: "liability",
  is_contra: true,
  balance: "-620000.00",
  class_code: "2",
};

function form(overrides: Partial<ChartAccountFormState> = {}): ChartAccountFormState {
  return {
    code: "100",
    name: "Kasa",
    accountType: "asset",
    isActive: true,
    isContra: false,
    ...overrides,
  };
}

describe("kod dilbilgisi — backend `codes.ACCOUNT_CODE_PATTERN` ile BIREBIR", () => {
  it("kapali bicim kumesini kabul eder: NN · NNN · NNN.NN", () => {
    for (const code of ["10", "12", "100", "191", "120.01", "320.04", "999.99"]) {
      expect(CHART_ACCOUNT_CODE_PATTERN.test(code), code).toBe(true);
    }
  });

  it("kume disini reddeder (ilk hane 0 · tek hane · UCUNCU kirilim · harf)", () => {
    for (const code of ["0", "1", "01", "012", "1000", "120.1", "120.001", "120.01.001", "12A", "12 "]) {
      expect(CHART_ACCOUNT_CODE_PATTERN.test(code), code).toBe(false);
    }
  });
});

describe("chartAccountFormBlockers — kaydet kapisi", () => {
  it("gecerli formda engel YOKTUR", () => {
    expect(chartAccountFormBlockers(form())).toEqual([]);
  });

  it("bos kod ve bos ad kapiyi kapatir", () => {
    expect(chartAccountFormBlockers(form({ code: "  " }))).toContain(
      CHART_ACCOUNT_FORM_BLOCKERS.code,
    );
    expect(chartAccountFormBlockers(form({ name: "" }))).toContain(
      CHART_ACCOUNT_FORM_BLOCKERS.name,
    );
  });

  /** 🔴 MUTASYON KANITI: tek karakter (`1000`) kapiyi KAPATIR. */
  it("bicimi bozuk kod BICIM engeli uretir (bos kod engeli DEGIL)", () => {
    const blockers = chartAccountFormBlockers(form({ code: "1000" }));
    expect(blockers).toEqual([CHART_ACCOUNT_FORM_BLOCKERS.codeFormat]);
  });

  it("bastaki/sondaki bosluk kirmizi yapmaz (kirpilarak denetlenir)", () => {
    expect(chartAccountFormBlockers(form({ code: " 120.01 " }))).toEqual([]);
  });
});

describe("changedChartAccountFields — yalniz DEGISEN alanlar", () => {
  it("hicbir sey degismediyse govde BOSTUR (kod kilidi bos yere riske atilmaz)", () => {
    expect(changedChartAccountFields(chartAccountFormOf(ACCOUNT), ACCOUNT)).toEqual({});
  });

  it("yalniz oynayan alani tasir", () => {
    expect(changedChartAccountFields(form({ name: "Merkez Kasa" }), ACCOUNT)).toEqual({
      name: "Merkez Kasa",
    });
    expect(changedChartAccountFields(form({ isActive: false }), ACCOUNT)).toEqual({
      is_active: false,
    });
    expect(changedChartAccountFields(form({ accountType: "expense" }), ACCOUNT)).toEqual({
      account_type: "expense",
    });
  });

  /**
   * 🔴 K7: `is_contra` `PATCH`te `bool | null`dır ve `null` "değişmedi" demektir
   * — null göndererek TEMİZLEME YOKTUR. Bu yüzden alan yalnız GERÇEKTEN oynadığında
   * gövdeye girer; `false`a çekmek de bir DEĞİŞİMDİR ve gönderilmek ZORUNDADIR
   * (aksi hâlde yanlış işaretlenmiş bir kontra hesap UI'dan geri alınamazdı).
   */
  it("is_contra iki yönde de tasinir (isaretleme VE isareti kaldirma)", () => {
    expect(changedChartAccountFields(form({ isContra: true }), ACCOUNT)).toEqual({
      is_contra: true,
    });
    const kontra: ChartAccountResponse = { ...ACCOUNT, is_contra: true };
    expect(changedChartAccountFields(form({ isContra: false }), kontra)).toEqual({
      is_contra: false,
    });
  });

  /**
   * 🔴🔴 K6 — SESSİZ KONTRA SİLME BEKÇİSİ (bu dilimin en tehlikeli kusuru).
   *
   * Kusurun anatomisi: `chartAccountFormOf` sunucudaki `is_contra`yı OKUMAZSA
   * form `false` başlar; kullanıcı SADECE hesap ADINI değiştirip kaydettiğinde
   * `changedChartAccountFields` "kontra kaldırıldı (true→false)" sanır, gövdeye
   * `is_contra: false` koyar ve MEVCUT bir kontra hesap adı düzenlendiği için
   * SESSİZCE bozulur → bilanço dengesizleşir. F-İK'nın `touched` dersinin
   * birebir tekrarı.
   *
   * 🔴 `toBeUndefined()` YETMEZ: `undefined` DEĞERİ taşıyan bir anahtar da
   * gövdededir ve serileşmede `null`a dönebilir; `null` ise backend'de
   * (`accounts_service.py:259`) "değişmedi" demektir — yani sessizce yanlış bir
   * sözleşme. Bu yüzden ANAHTARIN VARLIĞI ve TAM anahtar kümesi ölçülür.
   */
  it("🔴 K6: kontra hesapta BASKA alan degisirse `is_contra` govdeye HIC girmez", () => {
    const state: ChartAccountFormState = {
      ...chartAccountFormOf(KONTRA_ACCOUNT),
      name: "Birikmis Amortismanlar",
    };
    const body = changedChartAccountFields(state, KONTRA_ACCOUNT);

    expect(body).not.toHaveProperty("is_contra");
    expect(Object.keys(body)).toEqual(["name"]);
    expect(body).toEqual({ name: "Birikmis Amortismanlar" });
  });

  /** Aynı bekçi, alan alan: kod · tür · durum oynatıldığında da kontra sabit. */
  it("🔴 K6: kod/tur/durum oynasa da kontra hesabin bayragi govdeye girmez", () => {
    const base = chartAccountFormOf(KONTRA_ACCOUNT);
    const cases: readonly Partial<ChartAccountFormState>[] = [
      { code: "258" },
      { accountType: "asset" },
      { isActive: false },
    ];
    for (const patch of cases) {
      const body = changedChartAccountFields({ ...base, ...patch }, KONTRA_ACCOUNT);
      expect(body, JSON.stringify(patch)).not.toHaveProperty("is_contra");
      expect(Object.keys(body), JSON.stringify(patch)).toHaveLength(1);
    }
  });

  /**
   * 🔴 (d) `PATCH`te `null` = "DEĞİŞMEDİ" (`accounts_service.py:259`).
   * Null göndererek temizleme YOKTUR; bu yüzden gövde hiçbir koşulda `null`
   * (ya da `undefined`) DEĞER taşımaz — taşırsa sessizce yutulan bir yazma olur.
   */
  it("govde hicbir kosulda `null`/`undefined` DEGER tasimaz", () => {
    const bodies = [
      changedChartAccountFields(chartAccountFormOf(KONTRA_ACCOUNT), KONTRA_ACCOUNT),
      changedChartAccountFields(
        { ...chartAccountFormOf(KONTRA_ACCOUNT), name: "Yeni" },
        KONTRA_ACCOUNT,
      ),
      changedChartAccountFields(
        { ...chartAccountFormOf(KONTRA_ACCOUNT), isContra: false },
        KONTRA_ACCOUNT,
      ),
      changedChartAccountFields(form({ isContra: true }), ACCOUNT),
    ];
    for (const body of bodies) {
      for (const [key, value] of Object.entries(body)) {
        expect(value, key).not.toBeNull();
        expect(value, key).not.toBeUndefined();
      }
    }
  });

  /**
   * 🔴 TERS YÖN — "hiç gönderme" diye bir düzeltme yazan biri yukarıdaki
   * bekçiyi yeşil geçirir ama kullanıcı kontra bayrağını KALDIRAMAZ. Kutu
   * GERÇEKTEN oynatıldığında alan gövdede OLMAK ZORUNDA.
   */
  it("🔴 K6 ters yon: kutu GERCEKTEN oynatilirsa `is_contra: false` govdede OLMALI", () => {
    const body = changedChartAccountFields(
      { ...chartAccountFormOf(KONTRA_ACCOUNT), isContra: false },
      KONTRA_ACCOUNT,
    );
    expect(body).toHaveProperty("is_contra");
    expect(body.is_contra).toBe(false);
    expect(Object.keys(body)).toEqual(["is_contra"]);
  });

  /**
   * 🔴 TUREV ALAN GOVDEYE SIZMAZ: `balance`/`class_code`/`level` sunucuda
   * `extra="forbid"` yuzunden 422 uretir. Govde anahtarlari dort alanla sinirli.
   */
  it("turev alanlar (balance/class_code/level) govdeye HIC girmez", () => {
    const body = changedChartAccountFields(
      form({ code: "101", name: "Yeni", accountType: "expense", isActive: false }),
      ACCOUNT,
    );
    expect(Object.keys(body).sort()).toEqual([
      "account_type",
      "code",
      "is_active",
      "name",
    ]);
    for (const derived of ["balance", "class_code", "level", "id", "created_at", "updated_at"]) {
      expect(body).not.toHaveProperty(derived);
    }
  });
});

describe("form baslangici", () => {
  it("yeni hesap sunucu varsayilaniyla (is_active=true) acilir", () => {
    expect(emptyChartAccountForm()).toEqual({
      code: "",
      name: "",
      accountType: "asset",
      isActive: true,
      // 🔴 K7: sunucu varsayılanı `false`; "emin değilseniz boş bırakın" kuralının
      // form karşılığı budur — kontra bir hesap KAZAYLA açılmaz.
      isContra: false,
    });
  });

  it("mevcut hesabin is_contra bayragi forma TASINIR (duzenleme kipi)", () => {
    expect(chartAccountFormOf({ ...ACCOUNT, is_contra: true }).isContra).toBe(true);
  });

  // 🔴 BILINCLI GOC (MT-1/KK-1 devri, 2026-08-16): iddia DORT'ten BES'e tasindi,
  // SILINMEDI. Sebep: `ChartAccountType`a `equity` besinci uye olarak eklendi
  // (kullanici karari — TAM TDHP UYUMU). Secenek uretimi `ACCOUNT_TYPE_LABELS`
  // anahtarlarindan turedigi icin besinci secenek KENDILIGINDEN geldi; test onu
  // yakaladi. Etiket kaynagi `Mali Tablo - Bilanço.dc.html:80` (`III. OZKAYNAKLAR`)
  // — Hesap Plani mockup'inda 5xx hesap HIC cizilmemis, o yuzden HP kanonu bu
  // uye icin SUSAR ve etiket kardes mockup'tan alinir.
  // 🔴 Secenegin SUNULMASI zorunludur: canlida hesap plani BOSTUR (seed yok),
  // yani kullanici 5xx hesabini ancak bu formdan acabilir. Sunulmazsa bilancoda
  // OZKAYNAKLAR bolumu SONSUZA KADAR bos kalir ve AKTIF != PASIF olur.
  it("Tur acilirinda BES secenek vardir ve etiketleri HP + BL kanonundandir", () => {
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "asset",
      "liability",
      "revenue",
      "expense",
      "equity",
    ]);
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Aktif",
      "Pasif",
      "Gelir",
      "Gider",
      "Özkaynak",
    ]);
  });
});

/**
 * K8 — Tür açılırının placeholder'ı (mockup `Form - Hesap Ekle.dc.html:89`).
 * Seçenek sayısı 5'ten 6'ya çıkar; placeholder SEÇİLEMEZ ve form varsayılanı
 * `asset` olarak KALIR (mockup :90 `Aktif`i selected gösteriyor).
 */
describe("ACCOUNT_TYPE_PLACEHOLDER (mockup :89)", () => {
  it("placeholder metni mockup'tan gelir ve secenek listesine GIRMEZ", () => {
    expect(ACCOUNT_TYPE_PLACEHOLDER).toBe("Tür seçiniz...");
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.label)).not.toContain(
      ACCOUNT_TYPE_PLACEHOLDER,
    );
  });
});

/**
 * 🔴 KARAR K1 — mockup'ın kontra METNİ REDDEDİLDİ, KANON kazandı.
 *
 * Mockup `:118` "257 Birikmiş Amortismanlar — aktif tarafta durur" diyor ve
 * `:90`da türü `Aktif` seçili gösteriyor. YANLIŞ:
 * `backend/app/modules/accounting/balance_sheet.py:159-180` tablosunda `257`
 * **`liability`** türündedir, KALEMİ aktif taraftadır ve `is_contra = True`dır.
 * Karşı örnek olmadan kullanıcı "(-) varsa işaretle" diye YANLIŞ kuralı öğrenir
 * (`501 Ödenmemiş Sermaye (-)` işaretlenirse sermaye 6.000 yerine 14.000 olur —
 * aynı docstring'de ölçülmüş).
 */
describe("CONTRA_HELP — kutunun CÜMLELERİ kanondan (K1)", () => {
  it("kural cumlesi TERS taraf olcutunu soyler, `(-)` son ekini DEGIL", () => {
    expect(CONTRA_HELP.rule).toContain("TERSİ");
    expect(CONTRA_HELP.rule).not.toMatch(/\(-\)\s*ile bit/);
  });

  it("DOGRU ornek 257'dir ve turu PASIF'tir (mockup'in `Aktif` iddiasi REDDEDILDI)", () => {
    expect(CONTRA_HELP.positiveExample).toContain("257 Birikmiş Amortismanlar");
    expect(CONTRA_HELP.positiveExampleNote).toContain("Pasif");
    expect(CONTRA_HELP.positiveExampleNote).not.toContain("Aktif tarafta durur");
  });

  /** 🔴 KARŞI ÖRNEK ZORUNLU — bu iddia silinirse kutu yanlış kuralı öğretir. */
  it("KARSI ornek 501'dir ve ISARETLENMEZ der", () => {
    expect(CONTRA_HELP.counterExample).toContain("501 Ödenmemiş Sermaye");
    expect(CONTRA_HELP.counterExampleNote).toContain("İŞARETLENMEZ");
    expect(CONTRA_HELP.counterExampleNote).toContain("Özkaynak");
  });

  it("emin degilseniz bos birakin cumlesi VARDIR", () => {
    expect(CONTRA_HELP.fallback).toBe("Emin değilseniz boş bırakın.");
  });

  /**
   * K2 — mockup `:120` `102 Alınan Çekler Reeskontu` UYDURMADIR: TDHP'de `102`
   * **Bankalar**tır (`statement_map.py:311` — "TDHP 10 Hazır Değerler … 100+102").
   * Yerine tek doğru örnek `122 Alacak Senetleri Reeskontu (-)` kaldı.
   */
  it("K2: uydurma `102 Alinan Cekler Reeskontu` HICBIR metinde YOKTUR", () => {
    const hepsi = Object.values(CONTRA_HELP).join(" | ");
    expect(hepsi).not.toContain("102");
    expect(hepsi).toContain("122 Alacak Senetleri Reeskontu");
  });

  /**
   * 🔴 ÇIPLAK GLİF YASAĞI (ölçüldü): `src/styles/fonts.css` unicode-range'leri
   * `⚠` (U+26A0) ve `≠` (U+2260) glifini KAPSAMAZ → tofu kutusu basar.
   * Mockup `:125`/`:126` ikisini de kullanıyor; ikisi de metinden ÇIKARILDI.
   */
  it("kapsanmayan glifler (U+26A0 / U+2260) metne SIZMAZ", () => {
    const hepsi = Object.values(CONTRA_HELP).join(" | ");
    expect(hepsi).not.toMatch(/[⚠≠]/);
    expect(CONTRA_HELP.why).toContain("AKTİF ile PASİF eşitlenmez");
  });
});

/**
 * 🔴 KARAR K3 — canlı önizleme TÜRETİLİR, İCAT EDİLMEZ.
 *
 * Mockup `:133-147` 10 hâlin yalnız 2'sini çiziyor (ve `:146`da tür sabitken
 * yalnız fiilin değiştiğini varsayıyor — bu da yanlış: `is_contra` KALEMİN
 * TARAFINI çevirir). Kaynak formül `balance_sheet.py:180`:
 *   `etkin yön = (is_contra ? −1 : +1) × SIGN[account_type]`
 * `SIGN` `balance.py:101-109`: asset +1 · expense +1 · liability −1 ·
 * revenue −1 · equity −1.
 *
 * Katkının İŞARETİ ise `sign(katkı) = etkin × sign(net) = (kontra ? −1 : +1)`
 * — çünkü hesabın doğal `net` işareti zaten `SIGN[account_type]`tır. Yani
 * "eklenir/düşülür" YALNIZ bayraktan, "aktif/pasif" YALNIZ etkin yönden çıkar.
 */
describe("kontraOnizleme — 5 tur x 2 bayrak = 10 halin TAM SAYIMI (K3)", () => {
  it("SIGN sozlugu backend `balance.py:101-109` ile BIREBIR", () => {
    expect(ACCOUNT_TYPE_SIGN).toEqual({
      asset: 1,
      expense: 1,
      liability: -1,
      revenue: -1,
      equity: -1,
    });
  });

  const HALLER: readonly {
    readonly tur: ChartAccountType;
    readonly kontra: boolean;
    readonly etkinYon: 1 | -1;
    readonly text: string;
  }[] = [
    // --- Bilanço ailesi (asset · liability · equity) ---
    { tur: "asset", kontra: false, etkinYon: 1, text: "Normal — aktif toplama eklenir" },
    { tur: "asset", kontra: true, etkinYon: -1, text: "Kontra — pasif toplamdan düşülür" },
    { tur: "liability", kontra: false, etkinYon: -1, text: "Normal — pasif toplama eklenir" },
    // 🔑 KANON SATIRI: `257` tam olarak budur (liability + kontra → AKTİF taraf).
    { tur: "liability", kontra: true, etkinYon: 1, text: "Kontra — aktif toplamdan düşülür" },
    // 🔑 KARŞI ÖRNEK: `501` tam olarak budur (equity + kontra DEĞİL → PASİF taraf).
    { tur: "equity", kontra: false, etkinYon: -1, text: "Normal — pasif toplama eklenir" },
    { tur: "equity", kontra: true, etkinYon: 1, text: "Kontra — aktif toplamdan düşülür" },
    // --- Gelir tablosu ailesi (revenue · expense) ---
    // 🔴 `statement_map.period_profit()` (:414) TÜR ve KONTRA OKUMAZ ve bu bir
    // eksiklik DEĞİL BEKÇİdir → dört hâlin dördü AYNI cümleyi basar. Bilanço
    // cümlesini basmak YALAN olurdu: `6xx`/`7xx` bilanço gövdesine HİÇ girmez
    // (`statement_map.balance_sheet_line_for()` `None` döner).
    {
      tur: "revenue",
      kontra: false,
      etkinYon: -1,
      text: "Gelir tablosu hesabı — Dönem Net Kârına alacak − borç olarak girer; kontra bayrağı okunmaz",
    },
    {
      tur: "revenue",
      kontra: true,
      etkinYon: 1,
      text: "Gelir tablosu hesabı — Dönem Net Kârına alacak − borç olarak girer; kontra bayrağı okunmaz",
    },
    {
      tur: "expense",
      kontra: false,
      etkinYon: 1,
      text: "Gelir tablosu hesabı — Dönem Net Kârına alacak − borç olarak girer; kontra bayrağı okunmaz",
    },
    {
      tur: "expense",
      kontra: true,
      etkinYon: -1,
      text: "Gelir tablosu hesabı — Dönem Net Kârına alacak − borç olarak girer; kontra bayrağı okunmaz",
    },
  ];

  it("10 hal SAYILIDIR — tur x bayrak carpimi eksiksiz kapsanir", () => {
    expect(HALLER).toHaveLength(10);
    expect(new Set(HALLER.map((h) => `${h.tur}:${h.kontra}`)).size).toBe(10);
    expect(new Set(HALLER.map((h) => h.tur))).toEqual(
      new Set(ACCOUNT_TYPE_OPTIONS.map((o) => o.value)),
    );
  });

  for (const hal of HALLER) {
    it(`${hal.tur} + is_contra=${hal.kontra} → etkin ${hal.etkinYon} · "${hal.text}"`, () => {
      const onizleme = kontraOnizleme(hal.tur, hal.kontra);
      expect(onizleme.etkinYon).toBe(hal.etkinYon);
      expect(onizleme.text).toBe(hal.text);
      // Formülün kendisi: etkin yön = (kontra ? −1 : +1) × SIGN[tür].
      expect(onizleme.etkinYon).toBe((hal.kontra ? -1 : 1) * ACCOUNT_TYPE_SIGN[hal.tur]);
    });
  }

  /**
   * 🔴 MUTASYON KANITI: önizleme `account_type`tan TEK BAŞINA türetilemez.
   * `is_contra` girdi olmasaydı bu iki çift AYNI cümleyi basardı.
   */
  it("bayrak cumlelyi DEGISTIRIR — onizleme yalniz turden turemez", () => {
    expect(kontraOnizleme("liability", false).text).not.toBe(
      kontraOnizleme("liability", true).text,
    );
    expect(kontraOnizleme("asset", false).text).not.toBe(kontraOnizleme("asset", true).text);
  });

  /**
   * 🔴 MUTASYON KANITI: `257` (liability+kontra) ile `501` (equity+kontra DEĞİL)
   * ZIT cümle basar. Kutunun öğrettiği kural ile önizleme aynı kaynaktan gelir.
   */
  it("257 ile 501 ZIT cumle basar (kanon tablosunun ekrandaki karsiligi)", () => {
    expect(kontraOnizleme("liability", true).text).toBe("Kontra — aktif toplamdan düşülür");
    expect(kontraOnizleme("equity", false).text).toBe("Normal — pasif toplama eklenir");
  });

  it("sol hucre etiketi (mockup :143) mali tabloya gore turer", () => {
    expect(kontraOnizleme("asset", false).label).toBe("Bilançodaki davranışı");
    expect(kontraOnizleme("revenue", false).label).toBe("Gelir tablosundaki davranışı");
  });

  it("hicbir cumlede kapsanmayan glif (U+26A0 / U+2260) YOKTUR", () => {
    for (const hal of HALLER) {
      expect(kontraOnizleme(hal.tur, hal.kontra).text).not.toMatch(/[⚠≠]/);
    }
  });
});
