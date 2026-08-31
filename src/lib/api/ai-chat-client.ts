/**
 * FİİL AI sohbet akışı istemcisi (AI-1).
 *
 * 🔴 `backendClient` (openapi-fetch) KULLANILAMAZ: iki bağımsız sebep var.
 *   1. openapi-fetch yanıtı ayrıştırır (`res.json()`), yani akışı öldürür —
 *      catch-all BFF'i öldüren kusurun aynısı.
 *   2. `POST /ai/chat` üretilen `schema.d.ts`te YOKTUR (sözleşme devri bu
 *      dilimde backend tarafında yapılıyor); `backendClient.POST` typecheck'ten
 *      geçmezdi.
 *
 * Bu yüzden ham `fetch` + elle SSE ayrıştırması. Depoda emsali var: ikili
 * indirme istemcileri de (`audit-client`, `documents-client`) ham `fetch`
 * kullanır.
 *
 * `EventSource` de KULLANILMAZ: yalnız GET yapar, gövde taşıyamaz ve cookie
 * dışında başlık koyamaz. Sohbet mesajı bir POST gövdesidir.
 */

/** Akış hâlleri — backend `providers/base.py::_OLAY_ADLARI` ile birebir. */
export type AiTurSebebi =
  | "bitti"
  | "arac"
  | "kesildi"
  | "reddetme"
  | "duraklatildi"
  | "filtrelendi";

/**
 * Yapısal cevap bloğu — **backend'in `blocks.py` birleşiminin ikizi.**
 *
 * 🔴 K1: bu bloklar modelin YAZDIĞI metinden ASLA türetilmez; backend onları
 * araç sonucunun yapısal gövdesinden üretir. İstemci burada da hiçbir metin
 * ayrıştırması yapmaz — düz alanları basar.
 *
 * 🔴 `url` alanı YOKTUR ve olmayacaktır: derin bağlantı hedefi kapalı bir
 * **ekran anahtarıdır** ve yola `ai-screen-routes.ts` çevirir.
 */
export type AiBaglantiKalemi = {
  etiket: string;
  ekran: string;
  kimlik: string | null;
  birincil: boolean;
};

export type AiBlokTonu = "notr" | "bilgi" | "olumlu" | "uyari" | "kritik";

export type AiVarlikKalemi = {
  ad: string;
  alt_metin: string | null;
  /** 🔴 `null` ise çubuk ÇİZİLMEZ. `0` "bitti" demektir ve uydurma olurdu. */
  doluluk_yuzde: number | null;
  ton: AiBlokTonu;
  rozet_metni: string | null;
  baglanti: AiBaglantiKalemi | null;
};

export type AiBlok =
  | {
      tip: "metrik";
      baslik: string;
      deger_metni: string;
      ton: AiBlokTonu;
      alt_metin: string | null;
      alt_ton: AiBlokTonu | null;
    }
  | {
      tip: "oran_bari";
      baslik: string;
      deger_metni: string;
      yuzde_metni: string;
      yuzde_alt_etiketi: string;
      dilimler: { etiket: string; yuzde: number; ton: AiBlokTonu; alt_etiket: string }[];
      ton: AiBlokTonu;
    }
  | { tip: "uyari"; metin: string; ton: AiBlokTonu; vurgular: string[] }
  | { tip: "varlik_listesi"; baslik: string | null; kalemler: AiVarlikKalemi[] }
  | { tip: "ozet"; metin: string; vurgular: string[] }
  | { tip: "kaynak"; kalemler: AiBaglantiKalemi[] }
  | { tip: "aksiyon"; kalemler: AiBaglantiKalemi[] };

export type AiEvent =
  | { tip: "metin"; metin: string }
  | { tip: "arac_basladi"; cagri_id: string; arac_adi: string }
  | { tip: "arac_arguman"; cagri_id: string; parca: string }
  | { tip: "arac_hazir"; cagri_id: string; arac_adi: string; argumanlar: unknown }
  | {
      tip: "arac_sonuc";
      cagri_id: string;
      arac_adi: string;
      hal: string;
      mesaj: string;
      satir_sayisi: number | null;
    }
  | { tip: "yapisal_blok"; cagri_id: string; arac_adi: string; bloklar: AiBlok[] }
  | {
      tip: "tur_bitti";
      sebep: AiTurSebebi;
      kullanim: { girdi: number | null; cikti: number | null };
    }
  | { tip: "reddetme"; metin: string }
  | { tip: "hata"; kod: string; mesaj: string };

/** Akış AÇILMADAN dönen hata (403 · 422 · 503 …). `detail` DÜRÜST metindir. */
export class AiChatError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "AiChatError";
    this.status = status;
    this.detail = detail;
  }
}

/** Tanınan olay adları. Bilinmeyen ad SESSİZCE ATLANIR (ileri uyumluluk). */
const BILINEN_OLAYLAR = new Set<AiEvent["tip"]>([
  "metin",
  "arac_basladi",
  "arac_arguman",
  "arac_hazir",
  "arac_sonuc",
  "yapisal_blok",
  "tur_bitti",
  "reddetme",
  "hata",
]);

const AI_CHAT_URL = "/api/ai/chat";

const GENEL_HATA =
  "AI asistanına ulaşılamadı. Bu bir yetki sorunu değildir; lütfen yeniden deneyin.";

function olayaCevir(ad: string, veri: string): AiEvent | null {
  if (!BILINEN_OLAYLAR.has(ad as AiEvent["tip"])) return null;
  let govde: unknown;
  try {
    govde = JSON.parse(veri);
  } catch {
    // Bozuk kare turu ÖLDÜRMEZ; bir kare kaybetmek, paneli kilitlemekten iyidir.
    return null;
  }
  if (typeof govde !== "object" || govde === null) return null;
  return { tip: ad, ...(govde as object) } as AiEvent;
}

/**
 * SSE metnini karelere böler.
 *
 * 🔴 `:` ile başlayan satır SSE YORUMUDUR ve olay değildir — sunucu akışı
 * ters vekilin tamponundan çıkarmak için ilk kareyi yorum olarak gönderir.
 *
 * ⚠️ ÖLÇÜM (dürüstlük): burada bir zamanlar açık bir `startsWith(":")` atlaması
 * vardı; mutasyonla SİLİNDİĞİNDE hiçbir test kırmızı olmadı — çünkü aşağıdaki
 * `event:`/`data:` ön-ek kontrolleri yorum satırını zaten dışarıda bırakıyor
 * ve adsız kare `BILINEN_OLAYLAR` süzgecine takılıyor. Ölü satır SİLİNDİ;
 * yorumları eleyen gerçek mekanizma **tanınan olay adı kümesidir**. Yorum
 * testi bu yüzden bir bekçi değil POZİTİF KONTROLdür.
 */
export function* framesFromBuffer(chunk: string): Generator<AiEvent> {
  for (const ham of chunk.split("\n\n")) {
    if (ham.trim().length === 0) continue;
    let ad = "";
    const veriSatirlari: string[] = [];
    for (const satir of ham.split("\n")) {
      if (satir.startsWith("event:")) ad = satir.slice(6).trim();
      else if (satir.startsWith("data:")) veriSatirlari.push(satir.slice(5).trim());
    }
    if (ad.length === 0 || veriSatirlari.length === 0) continue;
    const olay = olayaCevir(ad, veriSatirlari.join("\n"));
    if (olay !== null) yield olay;
  }
}

/**
 * Bir turu akıtır.
 *
 * 🔴 `conversationId` AI-CHAT-2'de açıldı (§9-A3 kararı kapandı). Verilmezse
 * backend YENİ bir sohbet açar ve kimliğini akıştan DEĞİL, sonraki
 * `GET /ai/conversations` listesinden öğreniriz — akışın içine bir kimlik karesi
 * koymak, sohbet kimliğini olay sözleşmesine sokardı ve olay sözleşmesi
 * sağlayıcı-bağımsızdır.
 *
 * 🔴 Başkasına ait bir kimlik gönderilirse backend **404** döner (403 DEĞİL);
 * `AiChatError.detail` o dürüst cümleyi taşır.
 */
export async function* streamAiChat(
  mesaj: string,
  options: { signal?: AbortSignal; conversationId?: string | null } = {},
): AsyncGenerator<AiEvent> {
  const res = await globalThis.fetch(AI_CHAT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      options.conversationId
        ? { mesaj, conversation_id: options.conversationId }
        : { mesaj },
    ),
    signal: options.signal,
  });

  if (!res.ok || res.body === null) {
    // 🔴 Backend'in DÜRÜST metni ("sağlayıcı yapılandırılmadı") kullanıcıya
    // olduğu gibi ulaşır; "sistem hatası" diye ezilmez.
    const govde = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    const detay = typeof govde?.detail === "string" ? govde.detail : GENEL_HATA;
    throw new AiChatError(res.status, detay);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tampon = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      tampon += decoder.decode(value, { stream: true });
      // 🔴 SON parça tamponda BEKLETİLİR: bir kare yığın sınırına denk gelirse
      // yarısı bu okumada, yarısı sonrakinde gelir. Hepsini şimdi ayrıştırmak
      // yarım bir JSON'u çöpe atardı.
      const sinir = tampon.lastIndexOf("\n\n");
      if (sinir === -1) continue;
      const tam = tampon.slice(0, sinir + 2);
      tampon = tampon.slice(sinir + 2);
      yield* framesFromBuffer(tam);
    }
    tampon += decoder.decode();
    if (tampon.trim().length > 0) yield* framesFromBuffer(tampon);
  } finally {
    reader.releaseLock();
  }
}
