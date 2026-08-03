// Final inceleme F-3 (Important) — sayfalanmış liste uçlarının tavanı SESSİZCE
// YUTULAMAZ. `GET /subcontractor-progress-payments` `limit` varsayılanı 50,
// tavanı 200'dür ve yanıt `total` taşır; `items.length < total` ise elde TAM
// liste YOKTUR. Bu durum iki şeyi zorunlu kılar:
//   1) ekranda GÖRÜNÜR bir sınır göstergesi,
//   2) o listeye dayanan PARA DEĞERLERİNİN hiç basılmaması (yanlış sayı
//      basmaktansa pending göstermek — repo'nun zarif düşüş kararı).
// Tek kaynak burasıdır; her çağıran kendi eşik/metin mantığını YAZMAZ.

export interface ListTruncation {
  /** `true` ⇒ elde eksik liste var; türev toplam/oran GÜVENİLMEZ. */
  isTruncated: boolean;
  /** Gerçekten elde olan kayıt sayısı. */
  shownCount: number;
  /** Sunucunun bildirdiği toplam; bilinmiyorsa `shownCount`e eşitlenir. */
  totalCount: number;
}

/**
 * `total` bilinmiyorsa (yükleniyor/hata) kırpılma İDDİA EDİLMEZ — çağıran
 * taraf zaten kendi yükleniyor/hata yolunu işletir, buradan sahte bir uyarı
 * çıkmaz.
 */
export function buildListTruncation(
  shownCount: number,
  totalCount: number | undefined,
): ListTruncation {
  if (totalCount === undefined || totalCount <= shownCount) {
    return { isTruncated: false, shownCount, totalCount: totalCount ?? shownCount };
  }
  return { isTruncated: true, shownCount, totalCount };
}

/** Ekranda basılacak Türkçe sınır metni (tek kaynak — kopya cümle yazılmaz). */
export function listTruncationMessage(truncation: ListTruncation): string {
  return `İlk ${truncation.shownCount} kayıt gösteriliyor (toplam ${truncation.totalCount}) — liste eksik.`;
}
