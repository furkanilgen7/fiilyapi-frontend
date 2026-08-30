"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { useSession } from "@/components/shell/SessionProvider";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { AiChatError, streamAiChat, type AiEvent } from "@/lib/api/ai-chat-client";
import { AiAssistantMessage, AiTypingIndicator, AiUserMessage, AiWelcome } from "./AiMessage";
import { AiToolTrace } from "./AiToolTrace";
import "./ai-panel.css";

/**
 * FİİL AI paneli — `projedesign/AI Chat.dc.html` birebir.
 *
 * Mockup'ın KENDİ üst barı (22-38) BASILMAZ: kabuk canon kazanır (F3 Topbar).
 * Mockup'ın 260px sol sütunu ise nav DEĞİL **sohbet geçmişidir**, yani içeriktir
 * ve basılır.
 *
 * 🔴 SOHBET GEÇMİŞİ BU SÜRÜMDE KALICI DEĞİL. `ai_conversations`/`ai_messages`
 * tabloları AÇILMADI (§9-A3 kararı kullanıcıda bekliyor) ve tur DURUMSUZDUR.
 * Mockup'ın geçmiş listesi bu yüzden SİLİNMEZ, **devre dışı** basılır — kanon:
 * "rotası olmayan mockup öğesi silinmez, devre-dışı basılır". Aynı gerekçeyle
 * ek (+) düğmesi ve "PDF Rapor Al" da kapalıdır.
 */

const PERMISSION_MODULE = "ai";

/** Mockup 82-88: sol sütunun altına sabitlenen hazır sorular. */
const HIZLI_SORULAR: readonly string[] = [
  "📊 Bu ayki hakediş özeti",
  "⚠️ Kritik stok uyarıları",
  "💰 Nakit akış durumu",
  "📅 Bu hafta ne planlandı?",
];

/**
 * Mockup 52-77'deki geçmiş listesi. 🔴 Bu veriler ÖRNEK DEĞİL, mockup'ın
 * kendi metinleridir ve **devre dışı** basılır: kalıcı sohbet açılana kadar
 * tıklanacak bir şey yok.
 */
const GECMIS_TASLAGI: readonly { baslik: string; ozet: string; grup: string }[] = [
  { grup: "Bugün", baslik: "Güneşkent Hakedişi", ozet: "Hakediş 5 ne zaman..." },
  { grup: "Bugün", baslik: "Stok Analizi", ozet: "Kritik malzemeler hangileri" },
  { grup: "Bu Hafta", baslik: "Bordro Hesabı", ozet: "Temmuz bordrosu için..." },
  { grup: "Bu Hafta", baslik: "Proje Karşılaştırma", ozet: "4 projenin marj analizi" },
  { grup: "Bu Hafta", baslik: "KDV Hesabı", ozet: "Q2 KDV beyannamesi" },
];

const KAPALI_NOTU = "Kalıcı sohbet geçmişi bu sürümde kapalı.";

type Tur = {
  soru: string;
  metin: string;
  izler: { cagriId: string; aracAdi: string; sonuc?: Extract<AiEvent, { tip: "arac_sonuc" }> }[];
  hata: string | null;
  reddetme: string | null;
  bitti: boolean;
};

function bosTur(soru: string): Tur {
  return { soru, metin: "", izler: [], hata: null, reddetme: null, bitti: false };
}

/** Olayı tur durumuna uygular — saf fonksiyon, bu yüzden ayrıca test edilebilir. */
export function turaUygula(tur: Tur, olay: AiEvent): Tur {
  switch (olay.tip) {
    case "metin":
      return { ...tur, metin: tur.metin + olay.metin };
    case "arac_basladi":
      return {
        ...tur,
        izler: [...tur.izler, { cagriId: olay.cagri_id, aracAdi: olay.arac_adi }],
      };
    case "arac_sonuc":
      return {
        ...tur,
        izler: tur.izler.map((iz) =>
          iz.cagriId === olay.cagri_id && iz.sonuc === undefined ? { ...iz, sonuc: olay } : iz,
        ),
      };
    case "reddetme":
      return { ...tur, reddetme: olay.metin };
    case "hata":
      return { ...tur, hata: olay.mesaj };
    case "tur_bitti":
      return { ...tur, bitti: true };
    default:
      return tur;
  }
}

export function AiPanel() {
  const permission = useModulePermission(PERMISSION_MODULE);
  const { me } = useSession();
  const [girdi, setGirdi] = useState("");
  const [tur, setTur] = useState<Tur | null>(null);
  const [akiyor, setAkiyor] = useState(false);
  const iptalRef = useRef<AbortController | null>(null);

  useEffect(() => () => iptalRef.current?.abort(), []);

  const gonder = useCallback(
    async (mesaj: string) => {
      const kirpilmis = mesaj.trim();
      if (kirpilmis.length === 0 || akiyor) return;
      setGirdi("");
      setAkiyor(true);
      setTur(bosTur(kirpilmis));
      const controller = new AbortController();
      iptalRef.current = controller;
      try {
        for await (const olay of streamAiChat(kirpilmis, { signal: controller.signal })) {
          setTur((onceki) => (onceki === null ? onceki : turaUygula(onceki, olay)));
        }
      } catch (err) {
        // 🔴 Backend'in DÜRÜST metni ("sağlayıcı yapılandırılmadı") olduğu gibi
        // basılır; "sistem hatası" diye ezilmez.
        const mesajMetni =
          err instanceof AiChatError
            ? err.detail
            : "AI asistanına ulaşılamadı. Lütfen yeniden deneyin.";
        setTur((onceki) => (onceki === null ? onceki : { ...onceki, hata: mesajMetni }));
      } finally {
        setAkiyor(false);
      }
    },
    [akiyor],
  );

  if (!permission.canView) return <AccessDenied />;

  const yeniSohbet = () => {
    iptalRef.current?.abort();
    setTur(null);
    setGirdi("");
    setAkiyor(false);
  };

  return (
    <div className="ai-panel">
      {/* ── Sol: sohbet geçmişi (mockup 44-91) ───────────────────────── */}
      <aside className="ai-history" aria-label="Sohbet geçmişi">
        <div className="ai-history__new">
          <Button variant="primary" onClick={yeniSohbet}>
            + Yeni Sohbet
          </Button>
        </div>

        {["Bugün", "Bu Hafta"].map((grup) => (
          <div key={grup}>
            <p className="ai-history__heading">{grup}</p>
            <ul className="ai-history__list">
              {GECMIS_TASLAGI.filter((g) => g.grup === grup).map((g) => (
                <li key={g.baslik}>
                  {/* 🔴 Devre dışı DÜĞME, süslenmiş bir `li` değil: `aria-disabled`
                      `role="listitem"` üzerinde DESTEKLENMEZ (jsx-a11y ölçtü) ve
                      ekran okuyucu "kapalı"yı duyurmazdı. Öğe SİLİNMİYOR — mockup
                      birebir korunuyor — yalnız tıklanamıyor ve sebebi yazıyor. */}
                  <button
                    type="button"
                    className="ai-history__item ai-history__item--disabled"
                    disabled
                    title={KAPALI_NOTU}
                  >
                    <span className="ai-history__title">{g.baslik}</span>
                    <span className="ai-history__excerpt">{g.ozet}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="ai-history__note">{KAPALI_NOTU}</p>

        <div className="ai-quick">
          <p className="ai-history__heading">Hızlı Sorular</p>
          <div className="ai-quick__list">
            {HIZLI_SORULAR.map((soru) => (
              <Button
                key={soru}
                variant="ghost"
                size="sm"
                className="ai-quick__btn"
                disabled={akiyor}
                onClick={() => void gonder(soru.replace(/^\S+\s/u, ""))}
              >
                {soru}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Sağ: mesaj alanı + yazma kutusu (mockup 94-215) ───────────── */}
      <section className="ai-main" aria-label="FİİL AI Asistanı">
        <div className="ai-messages">
          {tur === null ? <AiWelcome adSoyad={me?.full_name ?? null} /> : null}

          {tur !== null ? (
            <>
              <AiUserMessage metin={tur.soru} />
              {tur.izler.length > 0 || tur.metin.length > 0 || tur.bitti ? (
                <AiAssistantMessage metin={tur.metin}>
                  {tur.izler.map((iz) => (
                    <AiToolTrace key={iz.cagriId} aracAdi={iz.aracAdi} sonuc={iz.sonuc} />
                  ))}
                </AiAssistantMessage>
              ) : null}
              {tur.reddetme !== null ? (
                <div className="ai-notice ai-notice--refusal" role="status">
                  {tur.reddetme}
                </div>
              ) : null}
              {tur.hata !== null ? (
                <div className="ai-notice ai-notice--error" role="status">
                  {tur.hata}
                </div>
              ) : null}
            </>
          ) : null}

          {akiyor && (tur?.metin.length ?? 0) === 0 ? <AiTypingIndicator /> : null}
        </div>

        <form
          className="ai-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void gonder(girdi);
          }}
        >
          <div className="ai-composer__box">
            <Textarea
              aria-label="FİİL AI'ya sorun"
              placeholder="FİİL AI'ya sorun... (proje analizi, hakediş özeti, stok raporu, maliyet hesabı...)"
              className="ai-composer__input"
              rows={1}
              maxLength={4000}
              value={girdi}
              disabled={akiyor}
              onChange={(event) => setGirdi(event.target.value)}
              onKeyDown={(event) => {
                // Enter gönderir, Shift+Enter satır atlar (mockup'ın textarea'sı).
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void gonder(girdi);
                }
              }}
            />
            <div className="ai-composer__actions">
              <Button
                variant="ghost"
                size="sm"
                className="ai-composer__attach"
                disabled
                aria-disabled="true"
                title="Dosya eklemek bu sürümde kapalı."
                aria-label="Dosya ekle (bu sürümde kapalı)"
              >
                +
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={akiyor}>
                Gönder
              </Button>
            </div>
          </div>
          <p className="ai-composer__hint">
            FİİL AI sisteminizin gerçek verilerini analiz eder · Yanıtlar yaklaşık olabilir,
            kritik kararlar için doğrulayın
          </p>
        </form>
      </section>
    </div>
  );
}
