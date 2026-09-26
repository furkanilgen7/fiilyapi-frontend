import type { CSSProperties } from "react";

/**
 * SZL "İlerleme" kolonunun ÇUBUK TONU (mockup 60, 70, 80, 90, 100).
 *
 * Mockup beş satırda DÖRT ayrı ton kullanır ve tonu belirleyen kural yazılı
 * değildir; satırlardan çıkarılır:
 *
 * | satır | % | çubuk | ray zemini | yüzde metni |
 * |---|---|---|---|---|
 * | 60  | 75  | `#2563eb` mavi | `#f1f5f9` | `#94a3b8` sönük |
 * | 70  | 100 | `#16a34a` yeşil | `#dcfce7` YEŞİL RAY | `#16a34a` |
 * | 80  | 58  | `#2563eb` mavi | `#f1f5f9` | `#94a3b8` sönük |
 * | 90  | 42  | `#f59e0b` kehribar | `#f1f5f9` | `#f59e0b` |
 * | 100 | 88  | `#8b5cf6` mor | `#f1f5f9` | `#8b5cf6` |
 *
 * DURUMLA (Aktif/Tamamlandı/Beklemede) açıklanamaz: 100. satır "Aktif" olduğu
 * hâlde 60/80'den FARKLI (mor) bir ton taşır. YÜZDEYLE ise beş satırın BEŞİ
 * de açıklanır (100 → yeşil, 80+ → mor, 50+ → mavi, altı → kehribar) — ray
 * zemini ve yüzde metni renkleri de aynı kuralla düşer. Bu yüzden eşik
 * kuralı seçildi.
 *
 * ⚠️ Eşiklerin KESİN yeri mockup'tan çıkarılamaz: örneklerden okunabilen tek
 * şey sınırın (42, 58] ve (75, 88] aralıklarında olduğudur; 50 ve 80 yuvarlak
 * değerler olduğu için seçildi. Bu belirsizlik rapora yazıldı.
 */
export type ContractProgressTone = "complete" | "high" | "mid" | "low";

const COMPLETE_THRESHOLD = 100;
const HIGH_THRESHOLD = 80;
const MID_THRESHOLD = 50;

export function contractProgressTone(pct: number): ContractProgressTone {
  if (pct >= COMPLETE_THRESHOLD) return "complete";
  if (pct >= HIGH_THRESHOLD) return "high";
  if (pct >= MID_THRESHOLD) return "mid";
  return "low";
}

/**
 * Çubuk genişliği YÜZDE metni olarak; 0-100 aralığına kırpılır.
 *
 * 🔴 F-SUBPX-3 · ray genişliği (`.szl-table__td` / taşeron kalem tablosunun
 * hücresi) `auto` tablo yerleşiminden gelir ve backend `progress_pct`i
 * kesirli olabilir (ör. `41.666...`) — ikisi çarpılınca çubuğun SAĞ UCU
 * (yuvarlak köşe) kesirli bir ekran pikseline denk düşer. Kesirli konum
 * tarayıcının kenar yumuşatmasını YARIM PİKSEL öteler ve bu yarım piksel,
 * sayfanın geri kalanındaki (font yükleme sırası, komşu kolonların metin
 * ölçüsü gibi) alakasız kesirli yerleşim değişiklikleriyle FARKLI
 * YUVARLANABİLİR — aynı commit'te iki koşu arasında ucun rengi 1-2 px
 * genişlikte değişir (bkz. `contracts-visual.spec.ts` ilerleme çubuğu ucu).
 *
 * Bu fonksiyon SADECE yüzde METNİNİ üretir (`"41.67%"`). Piksele oturtma
 * (CSS `round()`) BİLEREK burada YAPILMAZ — bkz. `contractProgressFillStyle`
 * ve `.szl-progress__fill` / `.tsd-progress__fill` kurallarındaki GERİ DÜŞÜŞ
 * gerekçesi: `round()`u doğrudan inline `width`e yazmak, onu DESTEKLEMEYEN
 * bir tarayıcıda (Safari < 15.4, Firefox < 118) TÜM bildirimi GEÇERSİZ kılar
 * ve çubuk genişliksiz (görünmez) kalırdı. Değer bunun yerine bir CSS ÖZEL
 * ÖZELLİĞİNE yazılır; asıl `width` bildirimi VE `round()` GERİ DÜŞÜŞÜ
 * STYLESHEET'te, `@supports` STATİK sorgusu ARKASINDA yaşar (ÖLÇÜLDÜ: art
 * arda iki çıplak `width` bildirimi burada İŞE YARAMAZ — `var()` içeren bir
 * bildirim parse anında geçersiz sayılamadığı için `round()`u tanımayan
 * tarayıcı yine de onu "kazanan" sayar ve hesaplanmış-değer anında `width`i
 * `auto`ya sıfırlar; `@supports`un koşulu `var()` İÇERMEDİĞİ için bu tuzağa
 * düşmez).
 */
export function contractProgressWidth(pct: number): string {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return `${clamped}%`;
}

/** `contractProgressFillStyle`in ürettiği inline style tipi — CSS özel özelliği taşır. */
export type ContractProgressFillStyle = CSSProperties & {
  "--contract-progress-width"?: string;
};

/**
 * Dolgu elemanının inline style'ı. `width` YAZMAZ — yalnız `--contract-progress-width`
 * özel özelliğini yazar; gerçek `width` bildirimleri (düz % + `round()` geri
 * düşüşü) `.szl-progress__fill` / `.tsd-progress__fill` kurallarında yaşar
 * (bkz. `contracts.css` ve `subcontractor-contract-detail.css`).
 */
export function contractProgressFillStyle(pct: number): ContractProgressFillStyle {
  return { "--contract-progress-width": contractProgressWidth(pct) };
}

/**
 * `progress_pct === null` HÂLİNİN GEREKÇESİ KANITLI MI? (kapsam maskesi,
 * kullanıcı kararı 2026-09-19)
 *
 * İki yüzey aynı soruyu sorar — sözleşme LİSTESİ (`ContractsTable`) ve E14
 * "Hakediş Özeti" kartı (`ContractPaymentSummaryCard`) — bu yüzden kural TEK
 * yerde yaşar. İki kopya olsaydı biri düzeltilip diğeri unutulduğunda aynı
 * sözleşme iki ekranda farklı gerekçe basardı.
 *
 * `progress_pct` (`Gorunurluk.operasyonel`) `finance` kapsamında maskelenir ve
 * `null` gelir. Aynı `null`, bedel yok/sıfırken de gelir
 * (`progress_payments/summary.py`: payda `<= 0` ise `None`). Şema bu iki hâli
 * AYIRMAZ — ama sözleşmenin KENDİ bedeli ayırt ettirir:
 *
 *   · bedel GÖRÜNÜR ve `<= 0`  → "bedel girilmemiş" gerekçesi KANITLI,
 *   · bedel GÖRÜNÜR ve `> 0`   → gerekçe YANLIŞ olurdu (bedel var!),
 *   · bedel `null`             → bedelin KENDİSİ maskeli (`Gorunurluk.para`,
 *     `limited` kapsam) — "bedel yok" değil "bedeli göremiyorsun" demektir,
 *     dolayısıyla yine kanıtsızdır.
 *
 * Kanıtsız hâlde gerekçe BASILMAZ (`placeholder-cell.ts` 3. hâli): uydurma bir
 * sebep, sessiz bir "—"den daha kötüdür.
 */
export function isProvenZeroAmount(amount: string | null | undefined): boolean {
  if (amount === null || amount === undefined) return false;
  const value = Number(amount);
  return Number.isFinite(value) && value <= 0;
}
