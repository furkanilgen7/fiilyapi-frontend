"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge/Badge";
import { cx } from "@/lib/cx";
import { formatCompactCurrency, formatDateDots, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ContractListItem, ContractType } from "@/lib/api/hooks/useContracts";

import { contractProgressTone, contractProgressWidth } from "./contract-progress";
import { CONTRACT_STATUS_BADGE } from "./contract-status";
import "./contracts.css";
import { routes } from "@/lib/routes";

/**
 * SZL 41-106 · sözleşme tablosu. Kolonlar mockup 44-51'den BİREBİR, sırasıyla:
 * Sözleşme (ad + alt satırda mono sözleşme no) · İşveren · Bedel (sağa) ·
 * Başlangıç · Bitiş · İlerleme · Durum · (başlıksız) Detay → kolonu.
 *
 * ⚠️ İkinci kolonun başlığı mockup'ta "İŞVEREN"dir (45) — mockup YALNIZ
 * işveren sekmesini çiziyor. Taşeron sekmesinde aynı hücre `counterparty_name`
 * ile TAŞERON firmasını taşıdığı için başlık o sekmede "Taşeron" olur; bu,
 * mockup'ın çizmediği ikinci sekmenin zorunlu karşılığıdır (kolon eklenmez,
 * kaldırılmaz — yalnız başlık türle birlikte gelir).
 *
 * Satır tıklaması + son kolondaki "Detay →" linki (62) aynı hedefe gider:
 * - işveren  → `/sozlesmeler/isveren/{id}` — `id` işveren satırında PROJE
 *   kimliğidir (backend `_employer_item(id=project.id)`), `ContractListItem`
 *   ayrı bir `project_id` alanı TAŞIMAZ.
 * - taşeron  → `/sozlesmeler/taseron/{id}` — sözleşme kimliği.
 * İki rota da T3/T7'de yazılacak; link'ler şimdiden doğru hedefe basılır.
 */
export interface ContractsTableProps {
  type: ContractType;
  isError: boolean;
  isLoading: boolean;
  items?: ContractListItem[];
}

export function ContractsTable({ type, isError, isLoading, items }: ContractsTableProps) {
  if (isError) return <p className="szl-message">Sözleşmeler yüklenemedi</p>;
  if (isLoading || !items) return <p className="szl-message">Yükleniyor…</p>;
  if (items.length === 0) {
    return (
      <section className="szl-empty">
        <p className="szl-empty__title">
          {type === "employer"
            ? "Henüz işveren sözleşmesi yok"
            : "Henüz taşeron sözleşmesi yok"}
        </p>
        <p className="szl-empty__hint">
          {type === "employer"
            ? "İşveren sözleşmesi proje formunda kurulur"
            : "+ Yeni Sözleşme ile başlayın"}
        </p>
      </section>
    );
  }

  return (
    <section className="szl-card">
      <table className="szl-table">
        <thead>
          <tr>
            <th className="szl-table__th szl-table__th--left">Sözleşme</th>
            <th className="szl-table__th szl-table__th--left">
              {type === "employer" ? "İşveren" : "Taşeron"}
            </th>
            <th className="szl-table__th szl-table__th--right">Bedel</th>
            <th className="szl-table__th szl-table__th--center">Başlangıç</th>
            <th className="szl-table__th szl-table__th--center">Bitiş</th>
            <th className="szl-table__th szl-table__th--center">İlerleme</th>
            <th className="szl-table__th szl-table__th--center">Durum</th>
            <th className="szl-table__th szl-table__th--center" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ContractRow key={item.id} item={item} type={type} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function detailHref(item: ContractListItem, type: ContractType): string {
  return type === "employer"
    ? routes.contracts.employerDetail({ projectId: item.id })
    : routes.contracts.subcontractorDetail({ contractId: item.id });
}

function ContractRow({ item, type }: { item: ContractListItem; type: ContractType }) {
  const router = useRouter();
  const href = detailHref(item, type);
  const badge = CONTRACT_STATUS_BADGE[item.status];

  return (
    <tr className="szl-row" onClick={() => router.push(href)} aria-label={item.title}>
      <td className="szl-table__td">
        <div className="szl-table__name">{item.title}</div>
        {/* 55: ad altındaki mono sözleşme numarası; şemada nullable. */}
        <div className="szl-table__no">{item.contract_no ?? "—"}</div>
      </td>
      <td className="szl-table__td szl-table__td--secondary">{item.counterparty_name ?? "—"}</td>
      <td className="szl-table__td szl-table__td--right szl-table__td--mono szl-table__td--strong">
        {formatCompactCurrency(item.amount)}
      </td>
      <td className="szl-table__td szl-table__td--center">
        {item.start_date ? formatDateDots(item.start_date) : "—"}
      </td>
      <td className="szl-table__td szl-table__td--center">
        {item.end_date ? formatDateDots(item.end_date) : "—"}
      </td>
      <td className="szl-table__td">
        <ProgressCell pct={item.progress_pct} />
      </td>
      <td className="szl-table__td szl-table__td--center">
        <Badge
          variant={badge.variant}
          className={cx("szl-badge", item.status === "on_hold" && "szl-badge--on-hold")}
        >
          {badge.label}
        </Badge>
      </td>
      <td className="szl-table__td szl-table__td--center">
        <Link
          href={href}
          className="szl-table__detail"
          onClick={(event) => event.stopPropagation()}
        >
          Detay →
        </Link>
      </td>
    </tr>
  );
}

/**
 * SZL 60 · ray + dolgu + altında yüzde metni. Taşeron sekmesinde backend
 * `progress_pct: null` döner (spec §2) → çubuk HİÇ çizilmez, hücre "—" +
 * görünür gerekçeyle basılır (kolon silinmez, sessiz boşluk bırakılmaz).
 */
function ProgressCell({ pct }: { pct: string | null | undefined }) {
  if (pct === null || pct === undefined) {
    return (
      <div
        className="szl-progress szl-progress--pending"
        title={pendingModuleLabel("subcontractor_progress_pct")}
        data-testid="szl-progress-pending"
      >
        —<span className="sr-only">{pendingModuleLabel("subcontractor_progress_pct")}</span>
      </div>
    );
  }

  const value = Number(pct);
  const tone = contractProgressTone(value);

  return (
    <div className="szl-progress" data-testid="szl-progress">
      <div className={`szl-progress__track szl-progress__track--${tone}`}>
        <div
          className={`szl-progress__fill szl-progress__fill--${tone}`}
          style={{ width: contractProgressWidth(value) }}
        />
      </div>
      <div className={`szl-progress__label szl-progress__label--${tone}`}>
        {formatPercent(value)}
      </div>
    </div>
  );
}
