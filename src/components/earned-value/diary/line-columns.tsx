import Link from "next/link";

import type { DiaryLineColumns, DiaryLineRef } from "@/components/site-diary/diary-extension";
import { ArrowRightIcon, XIcon } from "@/components/ui/icons";
import type { EvDayProgress } from "@/lib/api/models";
import type { PfBandSettings } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";

import { formatHours, toCenti } from "./hours";
import type { CodeIndex } from "./code-tree";
import { formatEarned, lineProgress } from "./line-progress";
import { PfBadge } from "./PfBadge";

export interface LineColumnsInput {
  lines: readonly DiaryLineRef[];
  progress: EvDayProgress | null;
  index: CodeIndex;
  bands: PfBandSettings;
  /** "Adam-Saat Bütçesi →" (İ:245) — şantiye rotası; kök ikizde de şantiyenin bütçesi. */
  budgetHref: string | null;
  /** Aktif baseline revizyon no (`days/{day}.revision_number`) — İ:213 alt başlığı (`null` → caption yok). */
  revisionNumber: number | null;
}

/**
 * Miktar tablosu ek kolonları — İ:220 başlık ("Bugün kaz. a-s" mavi · "PF"),
 * İ:229-230 hücreler, İ:248-252 alt toplam. Değerler backend payload'ındandır.
 */
export function buildLineColumns(input: LineColumnsInput): DiaryLineColumns {
  const { progress, index, bands } = input;
  return {
    headers: [
      { key: "ev-earned", label: <span className="ev-diary-col-earned">Bugün kaz. a-s</span>, align: "right" },
      { key: "ev-pf", label: "PF", align: "right" },
    ],
    renderCells: (line) => {
      const cell = lineProgress(line, progress, index);
      return [
        <span key="earned" className={cell.noRate ? "ev-diary-earned ev-diary-earned--none" : "ev-diary-earned"}>
          {cell.earned}
        </span>,
        <PfBadge key="pf" value={cell.pf} bands={bands} />,
      ];
    },
    footer: <LineProgressFooter {...input} />,
    renderItemCells: (boqItemId) => itemCells(boqItemId, input),
    // S2 · İ:241-246 — yalnız oransız satırın hemen altında.
    renderSubRow: (line) =>
      lineProgress(line, progress, index).noRate ? <UnratedNotice budgetHref={input.budgetHref} /> : null,
    // Karar 3 · İ:213 — alt başlığın TAMAMI; revizyon yoksa verilmez, çekirdek kendi metnini basar.
    caption:
      input.revisionNumber === null
        ? undefined
        : `İş tipi × bölüm · kazanılmış = bugün miktar × birim oran (Rev ${input.revisionNumber})`,
  };
}

/**
 * G2 kalem BAŞLIK satırı: kazanılmış + PF kalem düğümünden (`progress.items`,
 * `i:<kalem>` — EV-BORC-2 kapandı). Düğüm alt ağacı VE kaleme doğrudan yazılan saati
 * taşır; istemci yaprakları toplamaz (doğrudan saat yapraklarda görünmez).
 */
function itemCells(boqItemId: string, { progress, bands }: LineColumnsInput) {
  const item = progress?.items?.find((node) => node.node_id === `i:${boqItemId}`);
  return [
    <span key="earned" className="ev-diary-earned">{item ? formatEarned(item.earned_day) : EMPTY_CELL}</span>,
    <PfBadge key="pf" value={item?.pf_day ?? null} bands={bands} />,
  ];
}

function LineProgressFooter({ progress, bands }: LineColumnsInput) {
  return (
    <div className="ev-diary-line-foot">
      {/* İ:248-252 — "Bugün toplam kazanılmış · harcanan N a-s" + kazanılmış + PF */}
      <div className="ev-diary-line-foot__total">
        <span className="ev-diary-line-foot__label">
          Bugün toplam kazanılmış · harcanan{" "}
          <span className="ev-diary-mono">{formatHours(toCenti(progress?.spent_day ?? "0"))}</span> a-s
        </span>
        <span className="ev-diary-line-foot__earned">{formatEarned(progress?.earned_day ?? null)}</span>
        <PfBadge value={progress?.pf_day ?? null} bands={bands} />
      </div>
    </div>
  );
}

/** İ:241-246 — "✕ Bu kaleme oran atanmamış · Miktar kaydedilir, kazanılmış hesaplanmaz. · Adam-Saat Bütçesi →" (K12). */
function UnratedNotice({ budgetHref }: { budgetHref: string | null }) {
  return (
    <div className="ev-diary-norate" role="note">
      <XIcon className="ev-diary-norate__icon" aria-hidden="true" />
      <span className="ev-diary-norate__lead">Bu kaleme oran atanmamış</span>
      <span className="ev-diary-norate__text">Miktar kaydedilir, kazanılmış hesaplanmaz.</span>
      {budgetHref && (
        <Link href={budgetHref} className="ev-diary-norate__link">
          Adam-Saat Bütçesi <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
