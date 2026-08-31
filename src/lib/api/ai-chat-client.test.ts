import { afterEach, describe, expect, it, vi } from "vitest";
import { AiChatError, framesFromBuffer, streamAiChat, type AiEvent } from "./ai-chat-client";

/**
 * 🔴 `vitest.setup.ts`te ReadableStream/TextDecoder polyfill'i YOKTUR.
 * Ölçüldü: jsdom ortamında ikisi de Node globalinden geliyor ve çalışıyor;
 * bu iddia testin kendisiyle kayda geçiriliyor (aşağıdaki ilk `it`).
 */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

function sseResponse(chunks: string[]): Response {
  return new Response(streamOf(chunks), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

async function topla(mesaj = "x"): Promise<AiEvent[]> {
  const out: AiEvent[] = [];
  for await (const olay of streamAiChat(mesaj)) out.push(olay);
  return out;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("streamAiChat", () => {
  it("test ortami ReadableStream ve TextDecoder tasir (kapsam bos KALMAZ)", () => {
    expect(typeof ReadableStream).toBe("function");
    expect(typeof TextDecoder).toBe("function");
    expect(typeof TextEncoder).toBe("function");
  });

  it("kareleri olaylara cevirir ve `mesaj`i govdede yollar", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      sseResponse([
        ": fiil-ai akis acildi\n\n",
        'event: metin\ndata: {"metin":"Merhaba"}\n\n',
        'event: tur_bitti\ndata: {"sebep":"bitti","kullanim":{"girdi":10,"cikti":5}}\n\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const olaylar = await topla("selam");

    expect(olaylar).toEqual([
      { tip: "metin", metin: "Merhaba" },
      { tip: "tur_bitti", sebep: "bitti", kullanim: { girdi: 10, cikti: 5 } },
    ]);
    expect(fetchSpy.mock.calls[0][1].body).toBe(JSON.stringify({ mesaj: "selam" }));
  });

  it("🔴 YIGIN SINIRINA bolunmus kare KAYBOLMAZ", async () => {
    // Tek bir kare ÜÇ ayrı chunk'a bölünmüş: JSON'un ortasından ve kare
    // sonlandırıcısının (`\n\n`) ortasından kesiliyor.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(['event: metin\ndata: {"me', 'tin":"bolunmus"}\n', "\n"]),
      ),
    );
    expect(await topla()).toEqual([{ tip: "metin", metin: "bolunmus" }]);
  });

  it("POZITIF KONTROL — bastaki `:` YORUM karesi olay SAYILMAZ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([": fiil-ai akis acildi\n\n: ikinci yorum\n\n", 'event: metin\ndata: {"metin":"a"}\n\n']),
      ),
    );
    // Yorumlar olay üretseydi burada 3 öğe olurdu.
    expect(await topla()).toEqual([{ tip: "metin", metin: "a" }]);
  });

  it("🔴 BILINMEYEN olay adi SESSIZCE atlanir (ileri uyumluluk)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: gelecekteki_olay\ndata: {"x":1}\n\n',
          'event: metin\ndata: {"metin":"a"}\n\n',
        ]),
      ),
    );
    // Bilinmeyen ad turu ÖLDÜRMEZ ve `{tip:"gelecekteki_olay"}` diye
    // ayrıştırılmaz — panel onu basmaya çalışıp patlardı.
    expect(await topla()).toEqual([{ tip: "metin", metin: "a" }]);
  });

  it("`hata` karesi YUZEYE cikar (yutulmaz)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: hata\ndata: {"kod":"oturum_suresi_doldu","mesaj":"Oturumunuzun süresi doldu."}\n\n',
        ]),
      ),
    );
    expect(await topla()).toEqual([
      { tip: "hata", kod: "oturum_suresi_doldu", mesaj: "Oturumunuzun süresi doldu." },
    ]);
  });

  it("arac izi kareleri (basladi + sonuc) tasinir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: arac_basladi\ndata: {"cagri_id":"c1","arac_adi":"projeleri_listele"}\n\n',
          'event: arac_sonuc\ndata: {"cagri_id":"c1","arac_adi":"projeleri_listele","hal":"Restricted","mesaj":"Bu bilgiyi görme yetkiniz yok (projects). İçerik getirilmedi.","satir_sayisi":null}\n\n',
        ]),
      ),
    );
    const olaylar = await topla();
    expect(olaylar[0]).toMatchObject({ tip: "arac_basladi", arac_adi: "projeleri_listele" });
    expect(olaylar[1]).toMatchObject({ tip: "arac_sonuc", hal: "Restricted", satir_sayisi: null });
  });

  it("🔴 503 DURUST metni tasiyan AiChatError firlatir", async () => {
    const detay = "AI sağlayıcısı yapılandırılmadı: `AI_PROVIDER` boş.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: detay }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(topla()).rejects.toMatchObject({
      name: "AiChatError",
      status: 503,
      detail: detay,
    });
    // Metin "sistem hatası" diye EZİLMEZ.
    await expect(topla()).rejects.toBeInstanceOf(AiChatError);
  });

  it("detay tasimayan hata yanitinda genel ama DURUST cumle kullanilir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    await expect(topla()).rejects.toMatchObject({ status: 502 });
  });
});

// ---------------------------------------------------------------------------
// AI-CHAT-2 — `yapisal_blok` olayı + `conversation_id`
// ---------------------------------------------------------------------------

describe("AI-CHAT-2 sözleşmesi", () => {
  it("🔴 `yapisal_blok` TANINIR ve bloklar OLDUGU GIBI tasinir", () => {
    const kare =
      'event: yapisal_blok\ndata: {"cagri_id":"c1","arac_adi":"gosterge_ozeti","bloklar":[{"tip":"metrik","baslik":"Portföy","deger_metni":"₺12.500.000","ton":"bilgi","alt_metin":null,"alt_ton":null}]}\n\n';
    const olaylar = [...framesFromBuffer(kare)];
    expect(olaylar).toHaveLength(1);
    const olay = olaylar[0]!;
    expect(olay.tip).toBe("yapisal_blok");
    if (olay.tip !== "yapisal_blok") throw new Error("tip");
    expect(olay.bloklar[0]).toEqual({
      tip: "metrik",
      baslik: "Portföy",
      deger_metni: "₺12.500.000",
      ton: "bilgi",
      alt_metin: null,
      alt_ton: null,
    });
  });

  it("🔴 blok bir URL ALANI tasimaz — derin baglanti EKRAN ANAHTARIDIR", () => {
    const kare =
      'event: yapisal_blok\ndata: {"cagri_id":"c1","arac_adi":"navigate_to","bloklar":[{"tip":"aksiyon","kalemler":[{"etiket":"Stok","ekran":"stok","kimlik":null,"birincil":true}]}]}\n\n';
    const olay = [...framesFromBuffer(kare)][0]!;
    if (olay.tip !== "yapisal_blok") throw new Error("tip");
    const blok = olay.bloklar[0]!;
    if (blok.tip !== "aksiyon") throw new Error("blok tipi");
    const kalem = blok.kalemler[0]! as unknown as Record<string, unknown>;
    // 🔴 Sözleşme `ekran` taşır; `url`/`href` GELMEZ. Gelseydi istemcinin
    // rota kataloğu (S22) baypas edilebilirdi.
    expect(kalem.ekran).toBe("stok");
    expect(kalem.url).toBeUndefined();
    expect(kalem.href).toBeUndefined();
  });

  it("🔴 `conversationId` VERILMEZSE govdede ALAN HIC BULUNMAZ", async () => {
    const yakalanan: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: unknown, init: RequestInit) => {
        yakalanan.push(String(init.body));
        return new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 });
      }),
    );
    for await (const _ of streamAiChat("selam")) void _;
    expect(JSON.parse(yakalanan[0]!)).toEqual({ mesaj: "selam" });

    yakalanan.length = 0;
    for await (const _ of streamAiChat("selam", { conversationId: "abc" })) void _;
    expect(JSON.parse(yakalanan[0]!)).toEqual({ mesaj: "selam", conversation_id: "abc" });
  });
});
