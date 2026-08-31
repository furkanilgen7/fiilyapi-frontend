"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import { AiSearchIcon } from "./AiIcons";
import type { AiConversationRead } from "@/lib/api/hooks/useAiConversations";
import "./ai-panel.css";

/**
 * Sol sütun — sohbet geçmişi (mockup 54-131).
 *
 * 🔴 AI-1'de bu liste **sahte** metinlerle ve devre dışı basılıyordu; kalıcı
 * sohbet yoktu. A3 kararı kapandığı için artık GERÇEKTİR: kartlar
 * `GET /ai/conversations`ten gelir, tıklanabilir ve sohbet açar.
 *
 * 🔴 Arama **istemci tarafında** süzer ve bu bilinçlidir: uçta bir `q`
 * parametresi YOKTUR (ölçüldü) ve uydurmak, olmayan bir sözleşmeye yazmak
 * olurdu. Liste tavanı 100 kayıttır; süzgeç o tavanın İÇİNDE çalışır ve bu
 * ekranda dürüstçe söylenir.
 */

const BUGUN = "Bugün";
const BU_HAFTA = "Bu Hafta";
const GECEN_HAFTA = "Geçen Hafta";
const DAHA_ESKI = "Daha Eski";

/** Mockup'ın dört grubu (69 · 92 · 119). Sıra SABİTTİR. */
export const GRUP_SIRASI = [BUGUN, BU_HAFTA, GECEN_HAFTA, DAHA_ESKI] as const;

/**
 * Bir tarihi mockup'ın grup başlıklarına yerleştirir.
 *
 * 🔴 `simdi` bir PARAMETREDİR, `new Date()` çağrısı değil: aksi hâlde ne birim
 * testi ne de görsel kare deterministik olurdu (kare, koşulduğu güne göre
 * "Bugün" ya da "Bu Hafta" çizerdi).
 */
export function grupla(guncelleme: Date, simdi: Date): string {
  const gun = 24 * 60 * 60 * 1000;
  const bugunBasi = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).getTime();
  const fark = bugunBasi - new Date(
    guncelleme.getFullYear(),
    guncelleme.getMonth(),
    guncelleme.getDate(),
  ).getTime();
  if (fark <= 0) return BUGUN;
  if (fark < 7 * gun) return BU_HAFTA;
  if (fark < 14 * gun) return GECEN_HAFTA;
  return DAHA_ESKI;
}

/** Mockup 74: "4 mesaj · 09:42". Bugünse saat, değilse kısa tarih. */
export function metaSatiri(sohbet: AiConversationRead, simdi: Date): string {
  const t = new Date(sohbet.updated_at);
  const grup = grupla(t, simdi);
  const damga =
    grup === BUGUN
      ? t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : t.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return `${sohbet.message_count} mesaj · ${damga}`;
}

export interface AiHistoryProps {
  sohbetler: readonly AiConversationRead[];
  aktifId: string | null;
  yukleniyor: boolean;
  /** 🔴 Enjekte edilir: kare deterministik olsun (bkz. `grupla`). */
  simdi: Date;
  /** Erişilen veri kümeleri — aktörün GÖRDÜĞÜ araçlardan türetilir. */
  erisilenVeriler: readonly string[];
  onYeniSohbet: () => void;
  onSec: (id: string) => void;
}

/** Mockup 121-130: "Erişilen Veriler" rozet şeridi; 5'ten fazlası `+N`. */
const ROZET_TAVANI = 5;

export function AiHistory({
  sohbetler,
  aktifId,
  yukleniyor,
  simdi,
  erisilenVeriler,
  onYeniSohbet,
  onSec,
}: AiHistoryProps) {
  const [arama, setArama] = useState("");

  const gruplu = useMemo(() => {
    const kirpik = arama.trim().toLocaleLowerCase("tr-TR");
    const suzulmus = kirpik
      ? sohbetler.filter((s) => s.title.toLocaleLowerCase("tr-TR").includes(kirpik))
      : sohbetler;
    const harita = new Map<string, AiConversationRead[]>();
    for (const s of suzulmus) {
      const g = grupla(new Date(s.updated_at), simdi);
      harita.set(g, [...(harita.get(g) ?? []), s]);
    }
    return harita;
  }, [sohbetler, arama, simdi]);

  const gorunen = erisilenVeriler.slice(0, ROZET_TAVANI);
  const artan = erisilenVeriler.length - gorunen.length;

  return (
    <aside className="ai-history" aria-label="Sohbet geçmişi">
      <div className="ai-history__top">
        <Button variant="primary" className="ai-history__new-btn" onClick={onYeniSohbet}>
          <span className="ai-history__plus" aria-hidden="true">
            +
          </span>
          Yeni Sohbet
        </Button>
        {/* 🔴 Ham `<input>` YASAK — `ui/` primitive'i (form kontrolleri kuralı). */}
        <Input
          size="row"
          className="ai-history__search"
          placeholder="Sohbetlerde ara"
          aria-label="Sohbetlerde ara"
          value={arama}
          leftIcon={<AiSearchIcon />}
          onChange={(e) => setArama(e.target.value)}
        />
      </div>

      <div className="ai-history__scroll">
        {yukleniyor ? <p className="ai-history__note">Sohbetler yükleniyor…</p> : null}
        {!yukleniyor && sohbetler.length === 0 ? (
          <p className="ai-history__note">Henüz sohbetiniz yok. İlk sorunuzu sorun.</p>
        ) : null}
        {!yukleniyor && sohbetler.length > 0 && gruplu.size === 0 ? (
          <p className="ai-history__note">
            Bu aramaya uyan sohbet yok. Arama yalnız yüklenen son 100 sohbette çalışır.
          </p>
        ) : null}

        {GRUP_SIRASI.map((grup) => {
          const kalemler = gruplu.get(grup);
          if (!kalemler || kalemler.length === 0) return null;
          return (
            <section key={grup}>
              <h2 className="ai-history__heading">{grup}</h2>
              <ul className="ai-history__list">
                {kalemler.map((s) => {
                  const aktif = s.id === aktifId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`ai-conv${aktif ? " ai-conv--active" : ""}`}
                        aria-current={aktif ? "true" : undefined}
                        onClick={() => onSec(s.id)}
                      >
                        <span className="ai-conv__title-row">
                          {aktif ? <span className="ai-conv__dot" aria-hidden="true" /> : null}
                          <span className="ai-conv__title">{s.title}</span>
                        </span>
                        <span className="ai-conv__meta">{metaSatiri(s, simdi)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Mockup 121-130 — "Erişilen Veriler". 🔴 Sabit bir liste DEĞİL: aktörün
          GÖRDÜĞÜ araçlardan türetilir, yani yetkisi dar bir rol burada daha az
          rozet görür. Sabit yazsaydık ekran yetkiyi yanlış tarif ederdi. */}
      <div className="ai-history__data">
        <h2 className="ai-history__heading">Erişilen Veriler</h2>
        <div className="ai-history__chips">
          {gorunen.map((ad) => (
            <span key={ad} className="ai-data-chip">
              {ad}
            </span>
          ))}
          {artan > 0 ? <span className="ai-data-chip">+{artan}</span> : null}
          {erisilenVeriler.length === 0 ? (
            <span className="ai-data-chip ai-data-chip--empty">bilinmiyor</span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
