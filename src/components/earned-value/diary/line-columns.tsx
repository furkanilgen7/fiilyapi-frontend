import Link from "next/link";

import type { DiaryLineColumns, DiaryLineRef } from "@/components/site-diary/diary-extension";
import { ArrowRightIcon, XIcon } from "@/components/ui/icons";
import type { EvDayProgress } from "@/lib/api/models";
import { sumDecimalStrings } from "@/lib/decimal";
import type { PfBandSettings } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";

import { formatHours, toCenti } from "./hours";
import type { CodeIndex } from "./code-tree";
import { formatEarned, lineProgress, unratedLines } from "./line-progress";
import { PfBadge } from "./PfBadge";

export interface LineColumnsInput {
  lines: readonly DiaryLineRef[];
  progress: EvDayProgress | null;
  index: CodeIndex;
  bands: PfBandSettings;
  /** "Adam-Saat Bütçesi →" (İ:245) — şantiye rotası; kök ikizde de şantiyenin bütçesi. */
  budgetHref: string | null;
  /** Aktif baseline revizyon no (`days/{day}.revision_number`) — İ:213 alt başlığı. */
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
    caption:
      input.revisionNumber === null ? undefined : `kazanılmış = bugün miktar × birim oran (Rev ${input.revisionNumber})`,
  };
}

/**
 * G2 kalem BAŞLIK satırı: kazanılmış = kalemin (oranlı) yapraklarının payload
 * değerlerinin toplamı (§3.2 `earned_day(N) = Σ yaprak`); PF yalnız payload
 * kalem düğümünü (`i:<kalem>`) taşırsa — bugün taşımıyor → "—" (raporda istek:
 * doğrudan kalem koduna yazılan saat yapraklarda görünmez, istemci bölemez).
 */
function itemCells(boqItemId: string, { progress, index, bands }: LineColumnsInput) {
  const prefix = `l:${boqItemId}:`;
  const leaves = (progress?.leaves ?? []).filter(
    (leaf) => leaf.node_id.startsWith(prefix) && index.get(leaf.node_id)?.has_rate !== false,
  );
  const earned = leaves.length === 0 ? EMPTY_CELL : formatEarned(sumDecimalStrings(leaves.map((leaf) => leaf.earned_day)));
  const itemNode = progress?.leaves.find((leaf) => leaf.node_id === `i:${boqItemId}`);
  return [
    <span key="earned" className="ev-diary-earned">{earned}</span>,
    <PfBadge key="pf" value={itemNode?.pf_day ?? null} bands={bands} />,
  ];
}

function LineProgressFooter({ lines, progress, index, bands, budgetHref }: LineColumnsInput) {
  const unrated = unratedLines(lines, index);
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
      {unrated.length > 0 && <UnratedNotice labels={unrated.map((u) => u.label)} budgetHref={budgetHref} />}
    </div>
  );
}

/**
 * İ:241-246 oransız satır uyarısı. Sözleşmede satır-altı yuvası YOK
 * (`DiaryLineColumns` yalnız hücre + footer taşır) → uyarı satır altında değil
 * tablo altında, oransız satırların adıyla basılır (raporda sapma).
 */
function UnratedNotice({ labels, budgetHref }: { labels: readonly string[]; budgetHref: string | null }) {
  return (
    <div className="ev-diary-norate" role="note">
      <XIcon className="ev-diary-norate__icon" aria-hidden="true" />
      <span className="ev-diary-norate__lead">Bu kaleme oran atanmamış</span>
      <span className="ev-diary-norate__text">
        {labels.join(", ")} — miktar kaydedilir, kazanılmış hesaplanmaz.
      </span>
      {budgetHref && (
        <Link href={budgetHref} className="ev-diary-norate__link">
          Adam-Saat Bütçesi <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
