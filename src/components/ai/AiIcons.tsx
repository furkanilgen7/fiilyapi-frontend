/**
 * AI panelinin **yerel** SVG simgeleri.
 *
 * 🔴 EMOJİ DEĞİL, SVG — ve bu bir zevk meselesi değil ölçülmüş bir kısıttır.
 * `src/test-guards/symbol-subset-guard.test.ts` yazı tipi alt kümesini
 * `styles/fonts.css`ten okur ve kapsam dışı kalan kod noktalarını reddeder.
 * Mockup'ın şu altı glifi alt küme DIŞINDA ölçüldü ve ubuntu-latest'te
 * fontconfig ikamesine düşerdi — yani görsel kare CI'da yereldekinden FARKLI
 * çizilirdi (AI-1'de 🤖 ile birebir aynı kusur yaşandı):
 *
 *   👍 U+1F44D · 👎 U+1F44E · ⧉ U+29C9 · 🔩 U+1F529 · ⚡ U+26A1 · 🚰 U+1F6B0
 *   ve ● U+25CF
 *
 * Anlam korunur, taşıyıcı değişir. Alt kümede OLAN glifler (📊 ⚠️ 💰 📅 📋 🏗
 * 🏦 📦 🧾 📍) mockup'taki gibi bırakılır — gereksiz yere SVG'ye çevirmek
 * mockup birebirliğinden uzaklaştırırdı.
 */

export interface AiIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const varsayilan = { width: 14, height: 14 } as const;

export function ThumbUpIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? varsayilan.width}
      height={height ?? varsayilan.height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 14V7l3.2-4.6a1 1 0 011.8.6V6h3.1a1.2 1.2 0 011.2 1.4l-.9 5A1.6 1.6 0 0111.8 14H5zM5 7H2.8v7H5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThumbDownIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? varsayilan.width}
      height={height ?? varsayilan.height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M11 2v7l-3.2 4.6a1 1 0 01-1.8-.6V10H2.9A1.2 1.2 0 011.7 8.6l.9-5A1.6 1.6 0 014.2 2H11zm0 7h2.2V2H11"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mockup'ın `⧉ Kopyala` düğmesinin glifi. */
export function CopyIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? varsayilan.width}
      height={height ?? varsayilan.height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M10.5 3.2A1.7 1.7 0 008.8 2H4.2A2.2 2.2 0 002 4.2v4.6c0 .74.47 1.37 1.13 1.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sol sütundaki arama kutusunun büyüteci (mockup 64-67). */
export function AiSearchIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? 13}
      height={height ?? 13}
      viewBox="0 0 13 13"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Composer'ın gönder oku (mockup 358-360). */
export function SendIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? 16}
      height={height ?? 16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ataç (mockup 355-357) — bu sürümde **devre dışı** basılır. */
export function AttachIcon({ width, height, className }: AiIconProps = {}) {
  return (
    <svg
      width={width ?? 17}
      height={height ?? 17}
      viewBox="0 0 17 17"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M11.5 6.5l-4.6 4.6a2 2 0 01-2.8-2.8l5-5a3 3 0 014.2 4.2l-5 5a4 4 0 01-5.7-5.7l4.6-4.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
