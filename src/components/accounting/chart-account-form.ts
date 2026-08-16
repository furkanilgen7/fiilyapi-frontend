import type {
  ChartAccountResponse,
  ChartAccountType,
} from "@/lib/api/hooks/useChartOfAccounts";
import type { ChartAccountUpdate } from "@/lib/api/hooks/useChartOfAccountMutations";

import { ACCOUNT_TYPE_LABELS } from "./chart-of-accounts-rows";

/**
 * F-MUF T2 · Hesap Ekle/Düzenle diyaloğunun SAF katmanı.
 *
 * Kanon: `projedesign/Form - Hesap Ekle.dc.html` (aşağıda `M:` ön ekiyle satır
 * numarası verilir). Gövde BEŞ alandır — `code` · `name` · `account_type` ·
 * `is_active` · `is_contra` — ve artık BEŞİNİN DE kontrolü vardır (F-MU1'in
 * "kontra hesap UI'dan işaretlenemez" AÇIK BORCU burada KAPANDI).
 *
 * 🔴 **MOCKUP'IN KONTRA METNİ REDDEDİLDİ (KARAR K1).** `M:118` "257 Birikmiş
 * Amortismanlar — aktif tarafta durur" diyor, `M:90` türü `Aktif` seçili
 * gösteriyor, `M:139` `AKTİF` rozeti basıyor. Üçü de YANLIŞ. Kanon
 * `backend/app/modules/accounting/balance_sheet.py:159-180`:
 * `257` → `liability` + `is_contra = True` (kalemi AKTİF tarafta),
 * `501 Ödenmemiş Sermaye (-)` → `equity` + `is_contra = **False**`.
 * Kutunun DÜZENİ/rengi/yerleşimi `M:110-131`den aynen alınır; CÜMLELERİ
 * kanondan yazılır ve KARŞI ÖRNEK zorunludur (yoksa kullanıcı "(-) varsa
 * işaretle" diye yanlış kuralı öğrenir).
 *
 * `balance`/`class_code`/`level` TÜREVDİR (`schemas.py`: `extra="forbid"`
 * yüzünden gövdeye girerlerse **422**), bu yüzden formda salt-okunur bile
 * gösterilmezler: kullanıcı düzenlediğini sanacağı bir sayı görmemelidir.
 */

export interface ChartAccountFormState {
  readonly code: string;
  readonly name: string;
  readonly accountType: ChartAccountType;
  readonly isActive: boolean;
  /**
   * 🔴 K7 (ölçüldü): gövdede opsiyonel (sunucu varsayılanı `False`) · kolon
   * NOT NULL · TS `ChartAccountCreate`te **ZORUNLU** (`schema.d.ts:6611`) →
   * POST gövdesine yazılmak ZORUNDA. `PATCH`te `bool | null`dır ve `null`
   * "değişmedi" demektir; null göndererek TEMİZLEME YOKTUR.
   */
  readonly isContra: boolean;
}

/**
 * 🔴 Kod dilbilgisi — `backend/app/modules/accounting/codes.py`
 * `ACCOUNT_CODE_PATTERN` ile BİREBİR: `NN` (grup) · `NNN` (ana hesap) ·
 * `NNN.NN` (alt hesap). İlk hane `0` olamaz (sınıfsız hesap yoktur) ve üçüncü
 * kırılım (`NNN.NN.NNN`) hiçbir mockup'ta yoktur → AÇILMAZ.
 *
 * İstemcideki bu kopya bir KOLAYLIKTIR, kapı DEĞİLDİR: sunucu aynı deseni hem
 * şemada hem DB CHECK'inde tutar ve son sözü o söyler.
 */
export const CHART_ACCOUNT_CODE_PATTERN = /^(?:[1-9][0-9]|[1-9][0-9]{2}(?:\.[0-9]{2})?)$/;

export const CHART_ACCOUNT_FORM_BLOCKERS = {
  code: "Hesap kodu zorunludur.",
  codeFormat: "Hesap kodu 10 · 100 ya da 100.01 biçiminde olmalıdır; ilk hane 0 olamaz.",
  name: "Hesap adı zorunludur.",
} as const;

/** `Tür` açılırının seçenekleri — etiketler HP tablosunun kanonundan gelir. */
export const ACCOUNT_TYPE_OPTIONS: readonly {
  readonly value: ChartAccountType;
  readonly label: string;
}[] = (Object.keys(ACCOUNT_TYPE_LABELS) as ChartAccountType[]).map((value) => ({
  value,
  label: ACCOUNT_TYPE_LABELS[value],
}));

/**
 * `M:89` — Tür açılırının placeholder'ı (KARAR K8). Seçenek sayısı 5'ten 6'ya
 * çıkar. Placeholder SEÇİLEMEZ (disabled) ve varsayılan seçili DEĞİLDİR:
 * `M:90` `Aktif`i selected gösteriyor, form varsayılanı `asset` olarak KALIR.
 */
export const ACCOUNT_TYPE_PLACEHOLDER = "Tür seçiniz...";

/**
 * Hesap türünün DOĞAL bakiye yönü — `backend/app/modules/accounting/balance.py:101-109`
 * `SIGN` sözlüğünün BİREBİR kopyası. `+1` borç yönlü, `−1` alacak yönlü.
 *
 * 🔴 Bu bir KOLAYLIK kopyasıdır, kapı değildir: para hesabı sunucudadır.
 * Buradaki tek işi CANLI ÖNİZLEMEyi (`kontraOnizleme`) türetmektir.
 */
export const ACCOUNT_TYPE_SIGN: Readonly<Record<ChartAccountType, 1 | -1>> = {
  asset: 1,
  expense: 1,
  liability: -1,
  revenue: -1,
  equity: -1,
};

/** Gelir tablosu türleri — bilanço gövdesine GİRMEZLER (`statement_map.py:296`). */
const INCOME_STATEMENT_TYPES: ReadonlySet<ChartAccountType> = new Set<ChartAccountType>([
  "revenue",
  "expense",
]);

/**
 * `M:110-131` kontra kutusunun METNİ — düzeni mockup'tan, cümleleri KANONDAN
 * (KARAR K1). Metin burada durur ki birim test onu doğrudan ölçebilsin:
 * karşı örnek sessizce silinirse kutu YANLIŞ kuralı öğretmeye başlar.
 *
 * 🔴 `M:120`deki `102 Alınan Çekler Reeskontu` UYDURMADIR (KARAR K2): TDHP'de
 * `102` **Bankalar**tır (`statement_map.py:311`). Silindi; yerine tek doğru
 * örnek `122 Alacak Senetleri Reeskontu (-)` kaldı.
 *
 * 🔴 ÇIPLAK GLİF YASAĞI: `M:125`teki `⚠` (U+26A0) ve `M:126`daki `≠` (U+2260)
 * `src/styles/fonts.css` unicode-range'lerinin HİÇBİRİNDE yoktur → tofu basar.
 * Simge yerine `WarningTriangleIcon`, `≠` yerine SÖZCÜK kullanılır.
 */
export const CONTRA_HELP = {
  /** `M:115` başlık — mockup'ın kendi cümlesi doğru, aynen kaldı. */
  title: "Bu bir kontra hesaptır",
  /** Kanon kuralı — `balance_sheet.py:160-163`. */
  rule:
    "Hesabın doğal bakiye yönü, düştüğü mali tablo kaleminin tarafının TERSİ ise " +
    "işaretleyin; bakiyesi o kalemden düşülür.",
  positiveExample: "257 Birikmiş Amortismanlar (-)",
  positiveExampleNote:
    "Tür: Pasif + kontra İŞARETLİ. Alacak bakiyelidir ama kalemi Aktif taraftadır " +
    "(Maddi Duran Varlıklar), o kalemi azaltır. Aynı kalıp: " +
    "122 Alacak Senetleri Reeskontu (-).",
  counterExample: "501 Ödenmemiş Sermaye (-)",
  counterExampleNote:
    "Tür: Özkaynak + kontra İŞARETLENMEZ. Pasif tarafta kalır ve borç bakiyesi " +
    "sermayeyi zaten düşürür; işaretlenirse iki kez döner ve sermayeyi ARTIRIR. " +
    "Yani ada bakan bir kural yanlıştır: eksi işaretli her hesap kontra değildir.",
  whyTitle: "Neden önemli:",
  why: "Yanlış işaretlenen hesapta bilançoda AKTİF ile PASİF eşitlenmez ve mali tablo tutmaz.",
  fallback: "Emin değilseniz boş bırakın.",
} as const;

/** Canlı önizlemenin (`M:133-147`) TÜRETİLMİŞ sonucu. */
export interface ContraPreview {
  /** `(is_contra ? −1 : +1) × SIGN[account_type]` — `balance_sheet.py:180`. */
  readonly etkinYon: 1 | -1;
  /** `M:143` sol hücre: hesabın hangi mali tabloda davrandığı. */
  readonly label: string;
  /** `M:144` sağ hücre cümlesi. */
  readonly text: string;
  /** Rozet/renk seçimi için: kontra hâlinde vurgu değişir. */
  readonly tone: "normal" | "contra";
}

/**
 * 🔴 KARAR K3 — canlı önizleme TÜRETİLİR, İCAT EDİLMEZ.
 *
 * Mockup `M:133-147` 10 hâlin yalnız 2'sini çiziyor ve `M:146` "kontra
 * işaretlenirse bu satır 'aktif toplamdan düşülür' olarak değişir" diyerek
 * TARAFIN sabit kaldığını varsayıyor — bu da YANLIŞ: `is_contra` kalemin
 * TARAFINI çevirir (`257` bunun kanıtıdır: `liability` olduğu hâlde AKTİF
 * tarafta durur).
 *
 * İki çıkarım, iki ayrı kaynaktan:
 * * **Taraf** = `sign(etkin yön)` — `+1` aktif, `−1` pasif
 *   (`balance_sheet.py:_katki` docstring'i: "etkin yön, kalemin TARAFINA eşittir").
 * * **Fiil** = katkının işareti = `etkin × sign(net)`; hesabın doğal `net`
 *   işareti zaten `SIGN[account_type]` olduğu için sadeleşir:
 *   `(is_contra ? −1 : +1)` → normalde EKLENİR, kontrada DÜŞÜLÜR.
 *
 * 🔴 `revenue`/`expense` için bilanço cümlesi basmak YALAN olurdu: `6xx`/`7xx`
 * bilanço gövdesine HİÇ girmez (`statement_map.balance_sheet_line_for()`
 * `None` döner) ve `period_profit()` (`statement_map.py:414`) **tür ve kontra
 * OKUMAZ** — bu bir eksiklik değil, bilinçli bekçidir. Dört gelir tablosu hâli
 * bu yüzden aynı, DOĞRU cümleyi basar; kullanıcı `610 Satış İadeleri`ne bayrak
 * takmanın bir şeyi değiştirmediğini ekranda görür.
 */
export function kontraOnizleme(
  accountType: ChartAccountType,
  isContra: boolean,
): ContraPreview {
  const etkinYon = ((isContra ? -1 : 1) * ACCOUNT_TYPE_SIGN[accountType]) as 1 | -1;
  const tone = isContra ? "contra" : "normal";

  if (INCOME_STATEMENT_TYPES.has(accountType)) {
    return {
      etkinYon,
      label: "Gelir tablosundaki davranışı",
      text:
        "Gelir tablosu hesabı — Dönem Net Kârına alacak − borç olarak girer; " +
        "kontra bayrağı okunmaz",
      tone,
    };
  }

  const taraf = etkinYon === 1 ? "aktif" : "pasif";
  return {
    etkinYon,
    label: "Bilançodaki davranışı",
    text: isContra
      ? `Kontra — ${taraf} toplamdan düşülür`
      : `Normal — ${taraf} toplama eklenir`,
    tone,
  };
}

/**
 * Yeni hesabın başlangıcı: `is_active` sunucu varsayılanıyla (`true`),
 * `is_contra` da sunucu varsayılanıyla (`false`) aynı — "emin değilseniz boş
 * bırakın" kuralının form karşılığı budur.
 */
export function emptyChartAccountForm(): ChartAccountFormState {
  return { code: "", name: "", accountType: "asset", isActive: true, isContra: false };
}

export function chartAccountFormOf(account: ChartAccountResponse): ChartAccountFormState {
  return {
    code: account.code,
    name: account.name,
    accountType: account.account_type,
    isActive: account.is_active,
    isContra: account.is_contra,
  };
}

/**
 * Kaydet kapısı. Liste boş değilse düğme KAPALIdır ve gerekçe EKRANDA görünür
 * (`journalFormBlockers` ile aynı sözleşme).
 */
export function chartAccountFormBlockers(state: ChartAccountFormState): readonly string[] {
  const blockers: string[] = [];
  const code = state.code.trim();
  if (code.length === 0) blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.code);
  else if (!CHART_ACCOUNT_CODE_PATTERN.test(code))
    blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.codeFormat);
  if (state.name.trim().length === 0) blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.name);
  return blockers;
}

/**
 * `PATCH` gövdesi yalnız DEĞİŞEN alanları taşır (`BoqItemFormModal` emsali).
 * Hiçbir alan değişmediyse istek ATILMAZ — `code` değişmemiş bir hesabı
 * göndermek, kod kilidi 409'unu (`ACCOUNT_CODE_LOCKED`) boş yere riske atardı.
 */
export function changedChartAccountFields(
  state: ChartAccountFormState,
  original: ChartAccountResponse,
): ChartAccountUpdate {
  const body: ChartAccountUpdate = {};
  const code = state.code.trim();
  const name = state.name.trim();
  if (code !== original.code) body.code = code;
  if (name !== original.name) body.name = name;
  if (state.accountType !== original.account_type) body.account_type = state.accountType;
  if (state.isActive !== original.is_active) body.is_active = state.isActive;
  // K7: `is_contra` iki yönde de taşınır. İşareti KALDIRMAK da bir değişimdir ve
  // gönderilmezse yanlış işaretlenmiş bir hesap arayüzden geri alınamazdı.
  if (state.isContra !== original.is_contra) body.is_contra = state.isContra;
  return body;
}
