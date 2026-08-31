"use client";

import Link from "next/link";
import { Button, Select } from "@/components/ui";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import "./ai-panel.css";

/**
 * Sağ sütun — *Sohbet Bağlamı* · *Hızlı Analizler* · *Bu Sohbette Açılanlar*
 * (mockup 366-395).
 *
 * ## 🔴 ÖLÇÜM: `GET /ai/context` BU ALANLARIN HİÇBİRİNİ TAŞIMIYOR
 *
 * Ucun gövdesi ölçüldü (`app/modules/ai/schemas.py::AiContextResponse`):
 * `user_id · role_key · permissions · arac_adlari · yetkisiz_moduller ·
 * proje_kimlikleri_notu`. Proje adı, şantiye, dönem, ilerleme yüzdesi ve aktif
 * işçi sayısı **yoktur**.
 *
 * 🔴 Ve oraya EKLENEMEZ. Ucun kendi docstring'i sebebi yazıyor: `/ai/context`
 * `ai` kapısıyla korunur, `projects` kapısıyla DEĞİL — proje kimliklerini oraya
 * koymak `projects:none` olan bir role kimlik sızdırırdı. Aynı gerekçe proje
 * ADI ve İLERLEMESİ için de geçerlidir.
 *
 * Doğru mimari bu yüzden şudur: bağlam kartının her alanı **kendi modülünün
 * kapısından** okunur. Proje adı/ilerlemesi `GET /projects`ten gelir
 * (`projects:view`); yetkisi olmayan kullanıcı sayı değil **sebep** görür.
 *
 * ## 🔴 "Dönem" ve "Aktif işçi" bu dilimde BAĞLANMADI — ve sessiz kalmıyor
 *
 * İkisi de bir ŞANTİYE + ISO HAFTA seçimi ister
 * (`GET /sites/{site_id}/timesheet/week`); parametresiz bir kaynağı yoktur.
 * Uydurma sayı basmak yerine sebep yazılır — `MetricPlaceholder` disiplininin
 * ekran hâli. 🔴 K-BAYAT GEREKÇE: bu satır ilerideki bir dilimde **yeniden
 * ölçülmeli**; "uç yok" gerekçesi Milestone kartında aylarca bayat kaldı.
 */

const BAGLANMADI_DONEM =
  "Dönem bilgisi bir şantiye + ISO hafta seçimine bağlı; bu sürümde bağlanmadı.";
const BAGLANMADI_ISCI =
  "Aktif işçi sayısı şantiye puantajından gelir; şantiye seçimi bu sürümde yok.";

/** Mockup 384-390 — beş hızlı analiz çipi (başlık + alt metin). */
export const HIZLI_ANALIZLER: readonly { simge: string; baslik: string; alt: string; soru: string }[] =
  [
    {
      simge: "📊",
      baslik: "Hakediş Özeti",
      alt: "Bu ayın tablosu",
      soru: "Bu ayki hakediş özetini göster.",
    },
    {
      simge: "⚠️",
      baslik: "Risk Taraması",
      alt: "Stok, gecikme, nakit",
      soru: "Şu anki riskleri tara: stok, gecikme ve nakit akışı.",
    },
    {
      simge: "💰",
      baslik: "Kâr Analizi",
      alt: "Proje bazlı marj",
      soru: "Projelerin marjını karşılaştır.",
    },
    {
      simge: "📅",
      baslik: "Haftalık Plan",
      alt: "Ekip ve makine",
      soru: "Bu hafta ne planlandı? Ekip ve makine dağılımını göster.",
    },
    {
      simge: "🧾",
      baslik: "Fatura Kontrolü",
      alt: "Eşleşmeyen kalemler",
      soru: "Eşleşmeyen fatura kalemlerini listele.",
    },
  ];

export interface AiAcilanKayit {
  etiket: string;
  yol: string | null;
  sebep: string;
}

export interface AiContextPanelProps {
  projeler: readonly ProjectListItem[];
  seciliProjeId: string | null;
  projeYetkisiVar: boolean;
  akiyor: boolean;
  /** "Bu Sohbette Açılanlar" — bu turda gerçekten üretilen derin bağlantılar. */
  acilanlar: readonly AiAcilanKayit[];
  onProjeSec: (id: string) => void;
  onHizliAnaliz: (soru: string) => void;
}

function yuzdeMetni(deger: string | number | null | undefined): string | null {
  if (deger === null || deger === undefined) return null;
  const sayi = Number(deger);
  if (!Number.isFinite(sayi)) return null;
  return `%${sayi.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

export function AiContextPanel({
  projeler,
  seciliProjeId,
  projeYetkisiVar,
  akiyor,
  acilanlar,
  onProjeSec,
  onHizliAnaliz,
}: AiContextPanelProps) {
  const secili = projeler.find((p) => p.id === seciliProjeId) ?? projeler[0] ?? null;
  const ilerleme = secili ? yuzdeMetni(secili.progress_pct) : null;

  return (
    <aside className="ai-context" aria-label="Sohbet bağlamı">
      <h2 className="ai-context__heading">Sohbet Bağlamı</h2>
      <div className="ai-context__card">
        {!projeYetkisiVar ? (
          <p className="ai-context__reason">
            Proje bağlamını görmek için <strong>Projeler</strong> yetkisi gerekiyor. Bu bir
            sistem hatası değildir.
          </p>
        ) : secili === null ? (
          <p className="ai-context__reason">
            Kapsamınızda görünen bir proje yok. Bu, hiç proje olmadığı anlamına gelmez.
          </p>
        ) : (
          <>
            <p className="ai-context__project">{secili.name}</p>
            <p className="ai-context__site">
              <span aria-hidden="true">📍</span> {secili.code}
            </p>
            <dl className="ai-context__rows">
              <div className="ai-context__row">
                <dt>Dönem</dt>
                {/* 🔴 Uydurma yok: sebep yazılır. */}
                <dd className="ai-context__pending" title={BAGLANMADI_DONEM}>
                  bağlanmadı
                </dd>
              </div>
              <div className="ai-context__row">
                <dt>İlerleme</dt>
                <dd className={ilerleme ? "ai-context__strong" : "ai-context__pending"}>
                  {ilerleme ?? "—"}
                </dd>
              </div>
              <div className="ai-context__row">
                <dt>Aktif işçi</dt>
                <dd className="ai-context__pending" title={BAGLANMADI_ISCI}>
                  bağlanmadı
                </dd>
              </div>
            </dl>
          </>
        )}

        {/* Mockup 379: "Bağlamı Değiştir". 🔴 Ham `<select>` YASAK. */}
        {projeYetkisiVar && projeler.length > 0 ? (
          <Select
            className="ai-context__switch"
            aria-label="Bağlamı Değiştir"
            value={secili?.id ?? ""}
            onChange={(e) => onProjeSec(e.target.value)}
          >
            {projeler.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <h2 className="ai-context__heading">Hızlı Analizler</h2>
      <div className="ai-context__chips">
        {HIZLI_ANALIZLER.map((c) => (
          <Button
            key={c.baslik}
            variant="ghost"
            className="ai-chip"
            disabled={akiyor}
            onClick={() => onHizliAnaliz(c.soru)}
          >
            <span className="ai-chip__icon" aria-hidden="true">
              {c.simge}
            </span>
            <span className="ai-chip__body">
              <span className="ai-chip__title">{c.baslik}</span>
              <span className="ai-chip__sub">{c.alt}</span>
            </span>
          </Button>
        ))}
      </div>

      <h2 className="ai-context__heading">Bu Sohbette Açılanlar</h2>
      <div className="ai-context__opened">
        {acilanlar.length === 0 ? (
          // 🔴 Mockup'ta dolu görünen bu liste SAHTE VERİYLE doldurulmaz:
          // içeriği turun GERÇEKTEN ürettiği kaynaklardan gelir.
          <p className="ai-context__reason">
            Henüz bir kaynak açılmadı. Bir soru sorduğunuzda AI&apos;ın okuduğu ekranlar burada
            listelenir.
          </p>
        ) : (
          acilanlar.map((a) =>
            a.yol === null ? (
              <button
                key={a.etiket}
                type="button"
                className="ai-opened ai-opened--disabled"
                disabled
                title={a.sebep}
              >
                {a.etiket}
              </button>
            ) : (
              <Link key={a.etiket} href={a.yol} className="ai-opened">
                {a.etiket}
              </Link>
            ),
          )
        )}
      </div>
    </aside>
  );
}
