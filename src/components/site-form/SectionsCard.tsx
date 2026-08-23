import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { DateInput, Input, Select } from "@/components/ui";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import { emptySectionRow, type SectionIssue, type SectionRow } from "./sections-validate";
import { UserPickerOptions, isUserPickerDisabled, userPickerNote } from "./user-picker";

export interface SectionsCardProps {
  rows: SectionRow[];
  onRowsChange: (rows: SectionRow[]) => void;
  /** T10'un doğrulama çıktısı; tablonun ALTINDA listelenir (spec §6.5). */
  issues?: SectionIssue[];
}

/** Sütun genişlikleri mockup satır 110–115'ten gelir; token'ları CSS'te. */
const COLUMNS = [
  { label: "Bölüm Adı", modifier: "name" },
  { label: "Sorumlu", modifier: "responsible" },
  { label: "Başlangıç", modifier: "date" },
  { label: "Bitiş", modifier: "date" },
  { label: "Tahmini Bedel", modifier: "amount" },
] as const;

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 🏗 Bölümler (Fazlar) kartı (mockup satır 102–144, spec §4.4, §6). */
export function SectionsCard({ rows, onRowsChange, issues = [] }: SectionsCardProps) {
  const users = useUserOptions();
  const uid = useId();
  const noteId = `${uid}-picker-note`;
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Ekleme/silme sonrası odak: render'dan SONRA taşınır, bu yüzden hedef
  // state'te tutulur (ref'e render sırasında yazmak yasak).
  const [focusTarget, setFocusTarget] = useState<{ rowId: string } | "add" | null>(null);

  useEffect(() => {
    if (focusTarget === null) return;
    if (focusTarget === "add") {
      addButtonRef.current?.focus();
    } else {
      document.getElementById(`${uid}-name-${focusTarget.rowId}`)?.focus();
    }
    setFocusTarget(null);
  }, [focusTarget, uid]);

  function addRow() {
    const row = emptySectionRow();
    onRowsChange([...rows, row]);
    setFocusTarget({ rowId: row.id });
  }

  /** Yalnız KAYDEDİLMEMİŞ istemci satırını kaldırır: ağ isteği ve izin kapısı yok (§6.3). */
  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onRowsChange(next);
    const following = next[index];
    setFocusTarget(following ? { rowId: following.id } : "add");
  }

  function updateRow(index: number, patch: Partial<SectionRow>) {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  /**
   * Elektronik tablo beklentisi (§6.6): tablo İÇİNDE `Enter` yeni satır ekler ve
   * formu göndermez. Tablo DIŞINDA varsayılan gönderim korunur. `Escape`
   * bilerek hiçbir şey yapmaz (yanlışlıkla sayfadan çıkmayı önler).
   */
  function handleTableKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addRow();
  }

  const pickerDisabled = isUserPickerDisabled(users);

  return (
    <section className="pf-card pf-card--flush">
      <div className="sections__head">
        <h2 className="pf-card__title sections__title">🏗 Bölümler (Fazlar)</h2>
        <span className="sections__note">
          Şantiye iş fazlarına bölünür — her bölümün kendi iş kalemleri olur
        </span>
        <button type="button" className="sections__add-link" onClick={addRow}>
          + Bölüm Ekle
        </button>
      </div>

      <table className="sections__table" onKeyDown={handleTableKeyDown}>
        <caption className="sr-only">Bölümler</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`sections__th sections__th--${column.modifier}`}
              >
                {column.label}
              </th>
            ))}
            <th scope="col" className="sections__th sections__th--action" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="sections__empty" colSpan={6}>
                Henüz bölüm eklenmedi — şantiye bölümsüz de oluşturulabilir.
              </td>
            </tr>
          )}

          {rows.map((row, index) => {
            const label = index + 1;
            const nameIssue = issues.find((i) => i.index === index && i.field === "name");
            const endIssue = issues.find((i) => i.index === index && i.field === "endDate");
            return (
              <tr key={row.id} data-testid="section-row" className="sections__row">
                <td className="sections__cell sections__cell--lead">
                  <Input
                    size="row"
                    id={`${uid}-name-${row.id}`}
                    aria-label={`${label}. bölümün adı`}
                    value={row.name}
                    status={nameIssue ? "error" : "default"}
                    {...(nameIssue
                      ? { "aria-invalid": true as const, "aria-describedby": `${uid}-issue-${index}-name` }
                      : {})}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                </td>
                <td className="sections__cell">
                  <Select
                    size="row"
                    aria-label={`${label}. bölümün sorumlusu`}
                    aria-describedby={noteId}
                    disabled={pickerDisabled}
                    value={row.managerUserId}
                    onChange={(e) => updateRow(index, { managerUserId: e.target.value })}
                  >
                    <UserPickerOptions state={users} />
                  </Select>
                </td>
                <td className="sections__cell">
                  <DateInput
                    size="row"
                    aria-label={`${label}. bölümün başlangıç tarihi`}
                    value={row.startDate}
                    onValueChange={(iso) => updateRow(index, { startDate: iso })}
                  />
                </td>
                <td className="sections__cell">
                  <DateInput
                    size="row"
                    aria-label={`${label}. bölümün bitiş tarihi`}
                    value={row.endDate}
                    status={endIssue ? "error" : "default"}
                    {...(endIssue
                      ? { "aria-invalid": true as const, "aria-describedby": `${uid}-issue-${index}-endDate` }
                      : {})}
                    onValueChange={(iso) => updateRow(index, { endDate: iso })}
                  />
                </td>
                {/* YER TUTUCU (§3.5): kontrol basılmaz, odak sırasında değildir. */}
                <td
                  className="sections__cell sections__cell--amount"
                  data-testid="section-amount-cell"
                  title={pendingModuleLabel("boq")}
                >
                  —<span className="sr-only">İş kalemlerinden hesaplanacak</span>
                </td>
                <td className="sections__cell sections__cell--action">
                  <button
                    type="button"
                    className="sections__remove"
                    aria-label={`${label}. bölümü sil`}
                    onClick={() => removeRow(index)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}

          <tr className="sections__add-row">
            <td colSpan={6}>
              <button
                type="button"
                ref={addButtonRef}
                className="sections__add-dashed"
                onClick={addRow}
              >
                <PlusIcon />
                {/* "veya şablon kullan" BASILMAZ: bölüm şablonu özelliği yok (§11.3). */}
                Bölüm ekle
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {issues.length > 0 && (
        <ul className="sections__issues" role="alert">
          {issues.map((issue) => (
            <li key={`${issue.index}-${issue.field}`} id={`${uid}-issue-${issue.index}-${issue.field}`}>
              {issue.index + 1}. satır: {issue.message}
            </li>
          ))}
        </ul>
      )}

      {/* Sessiz boş açılır liste YASAK (TZ-4b): sorumlu seçicisinin durumu
          her hâlükârda yazıyla açıklanır. */}
      <p className="sections__picker-note" id={noteId}>
        {userPickerNote(users)}
      </p>
    </section>
  );
}
