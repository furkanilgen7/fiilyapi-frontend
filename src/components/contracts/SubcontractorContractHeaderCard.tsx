import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import { cx } from "@/lib/cx";
import { formatCurrency, formatDateDots } from "@/lib/format";
import type { SubcontractorContractDetail } from "@/lib/api/hooks/useSubcontractorProgressPayments";

import { CONTRACT_STATUS_BADGE } from "./contract-status";
import "./subcontractor-contract-detail.css";

/**
 * TSD 33-76 · başlık kartı + bağlantı zinciri + 4 metrik.
 * Kanon: projedesign `Taşeron Sözleşme Detay.dc.html` (parantez içi = satır).
 *
 * Alan eşlemesi:
 * - 37  kehribar mono sözleşme no → `contract_no` (nullable → "—")
 * - 38  durum rozeti             → `status` (SZL/E14 ile TEK kaynak)
 * - 40  h1 "Akın İnşaat — Betonarme Sözleşmesi" → `subcontractor_name` +
 *       `work_category`. Şemada BAŞLIK ALANI YOKTUR; mockup'ın kendi
 *       kalıbı ("<taşeron> — <kategori> Sözleşmesi") iki alandan kurulur,
 *       kategori boşsa yalnız taşeron adı kalır (uydurma ek YOK).
 * - 41  "Taşeron: … · VKN: …"    → `subcontractor_name` + `tax_number`.
 *       🛑 VKN sözleşme şemasında YOKTUR ve `GET /subcontractors/{id}` ucu da
 *       YOKTUR (yalnız PATCH/DELETE — openapi teyidi). Değer, `GET
 *       /subcontractors` LİSTESİNDEN `subcontractor_id` ile süzülerek çözülür
 *       (çağıranın işi); çözülemezse "—" + görünür gerekçe.
 * - 43  "+ Hakediş Oluştur"      → `/hakedisler/taseron/yeni?contract={id}`
 * - 47-68 bağlantı zinciri       → işveren sözleşmesi · proje · şantiye · bu sözleşme
 * - 71  İmza Tarihi              → `signature_date`
 * - 72  Bitiş Tarihi             → `end_date`
 * - 73  Toplam Sözleşme Bedeli   → `contract_total` (kehribar, mono)
 * - 74  Ödenen Hakediş           → hakediş listesinden türev (yeşil, mono);
 *       kırpılmada "—" + gerekçe
 */
export interface ChainLink {
  /** Zincir rozetinin metni (49, 55, 60, 65). */
  chip: string;
  /** Rozetin tonu — mockup dört ayrı renk kullanır. */
  tone: "employer" | "project" | "site" | "current";
  /** Kalın birincil metin (50, 56, 61, 66). */
  primary: string;
  /** Sönük ikincil metin (51) — yalnız işveren halkasında vardır. */
  secondary?: string | null;
  /** Varsa halka tıklanabilir olur; yoksa düz metin kalır. */
  href?: string | null;
  /** Değer çözülemediyse görünür gerekçe (sessiz boşluk YASAK). */
  pendingReason?: string | null;
}

export interface SubcontractorContractHeaderCardProps {
  detail: SubcontractorContractDetail;
  /** 41 · `GET /subcontractors` listesinden süzülen VKN; çözülemezse `null`. */
  taxNumber: string | null;
  /** 41 · VKN çözülemediyse gerekçe. */
  taxNumberReason: string | null;
  /** 47-68 · dört halka; çağıran taraf kurar (veri kaynakları farklıdır). */
  chain: ChainLink[];
  /** 74 · kümülatif hakediş; PENDING ise `null`. */
  cumulativeGross: string | null;
  /** 74 · PENDING gerekçesi. */
  cumulativeGrossReason: string;
  /** 43 · "+ Hakediş Oluştur" hedefi (sözleşme önseçili). */
  createPaymentHref: string;
}

const DASH = "—";

/** 40 · mockup başlık kalıbı — kategori yoksa ek metin UYDURULMAZ. */
export function subcontractorContractTitle(detail: SubcontractorContractDetail): string {
  const name = detail.subcontractor_name ?? DASH;
  return detail.work_category ? `${name} — ${detail.work_category} Sözleşmesi` : name;
}

export function SubcontractorContractHeaderCard({
  detail,
  taxNumber,
  taxNumberReason,
  chain,
  cumulativeGross,
  cumulativeGrossReason,
  createPaymentHref,
}: SubcontractorContractHeaderCardProps) {
  const badge = CONTRACT_STATUS_BADGE[detail.status];

  return (
    <section className="tsd-head" aria-labelledby="tsd-title">
      <div className="tsd-head__top">
        <div>
          <div className="tsd-head__meta">
            <span className="tsd-head__no">{detail.contract_no ?? DASH}</span>
            <Badge
              variant={badge.variant}
              className={cx("szl-badge", detail.status === "on_hold" && "szl-badge--on-hold")}
            >
              {badge.label}
            </Badge>
          </div>
          <h1 className="tsd-head__title" id="tsd-title">
            {subcontractorContractTitle(detail)}
          </h1>
          <div className="tsd-head__parties">
            <span>{`Taşeron: ${detail.subcontractor_name ?? DASH} · VKN: `}</span>
            {taxNumber ? (
              <span data-testid="tsd-tax-number">{taxNumber}</span>
            ) : (
              <span
                className="tsd-head__pending"
                title={taxNumberReason ?? undefined}
                data-testid="tsd-tax-number-pending"
              >
                {DASH}
                {taxNumberReason && <span className="sr-only">{taxNumberReason}</span>}
              </span>
            )}
          </div>
        </div>

        {/* 43 · kehribar birincil eylem — mockup'ta `<a>`, buton değil. */}
        <Link href={createPaymentHref} className="tsd-head__new-payment">
          + Hakediş Oluştur
        </Link>
      </div>

      {/* 47-68 · bağlantı zinciri */}
      <div className="tsd-chain" data-testid="tsd-chain">
        {chain.map((link, index) => (
          <div className="tsd-chain__group" key={link.tone}>
            {index > 0 && (
              <span className="tsd-chain__sep" aria-hidden="true">
                →
              </span>
            )}
            <span className={cx("tsd-chain__chip", `tsd-chain__chip--${link.tone}`)}>
              {link.chip}
            </span>
            {link.href ? (
              <Link href={link.href} className="tsd-chain__primary tsd-chain__primary--link">
                {link.primary}
              </Link>
            ) : (
              <span
                className={cx(
                  "tsd-chain__primary",
                  link.pendingReason && "tsd-chain__primary--pending",
                )}
                title={link.pendingReason ?? undefined}
              >
                {link.primary}
                {link.pendingReason && <span className="sr-only">{link.pendingReason}</span>}
              </span>
            )}
            {link.secondary && <span className="tsd-chain__secondary">{link.secondary}</span>}
          </div>
        ))}
      </div>

      {/* 70-75 · dört metrik */}
      <div className="tsd-metrics" data-testid="tsd-metrics">
        <div>
          <div className="tsd-metrics__label">İmza Tarihi</div>
          <div className="tsd-metrics__value">
            {detail.signature_date ? formatDateDots(detail.signature_date) : DASH}
          </div>
        </div>
        <div>
          <div className="tsd-metrics__label">Bitiş Tarihi</div>
          <div className="tsd-metrics__value">
            {detail.end_date ? formatDateDots(detail.end_date) : DASH}
          </div>
        </div>
        <div>
          <div className="tsd-metrics__label">Toplam Sözleşme Bedeli</div>
          <div
            className="tsd-metrics__value tsd-metrics__value--contract"
            data-testid="tsd-contract-total"
          >
            {formatCurrency(detail.contract_total)}
          </div>
        </div>
        <div>
          <div className="tsd-metrics__label">Ödenen Hakediş</div>
          {cumulativeGross === null ? (
            <div
              className="tsd-metrics__value tsd-metrics__value--pending"
              title={cumulativeGrossReason}
              data-testid="tsd-cumulative-gross-pending"
            >
              {DASH}
              <span className="sr-only">{cumulativeGrossReason}</span>
            </div>
          ) : (
            <div
              className="tsd-metrics__value tsd-metrics__value--paid"
              data-testid="tsd-cumulative-gross"
            >
              {formatCurrency(cumulativeGross)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
