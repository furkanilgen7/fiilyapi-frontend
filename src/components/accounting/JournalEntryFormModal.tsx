"use client";

import { useMemo, useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button, Field, Input } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import {
  CHART_ACCOUNTS_MAX_LIMIT,
  useChartOfAccounts,
} from "@/lib/api/hooks/useChartOfAccounts";
import type { JournalEntryDetailResponse } from "@/lib/api/hooks/useJournalEntries";
import { useJournalEntry } from "@/lib/api/hooks/useJournalEntry";
import {
  useCreateJournalEntry,
  useReplaceJournalLines,
  useUpdateJournalEntry,
} from "@/lib/api/hooks/useJournalEntryFormMutations";

import { JournalBalanceStrip } from "./JournalBalanceStrip";
import { JournalLinesEditor } from "./JournalLinesEditor";
import {
  applyLineAmount,
  changedEntryFields,
  draftsFromEntry,
  emptyJournalLine,
  initialJournalLines,
  journalFormBlockers,
  journalTotals,
  linesChanged,
  selectableLineAccounts,
  todayIsoDate,
  toJournalLineInputs,
  type JournalEntryFormState,
  type JournalLineDraft,
  type LineSide,
} from "./journal-entry-form";
import "@/components/settings/settings.css";
import "./accounting.css";

export interface JournalEntryFormModalProps {
  /** `null` ⇒ oluşturma kipi; aksi hâlde düzenlenecek fişin kimliği. */
  entryId: string | null;
  onClose: () => void;
}

const NOT_DRAFT_NOTICE =
  "Yalnızca taslak fiş düzenlenebilir; bu fiş kayıtlaştırılmış ya da terslenmiş.";

/**
 * E8:67 `+ Yevmiye Kaydı` / taslak satırının `Düzenle` diyaloğu.
 *
 * Düzenleme kipinde bacaklar LİSTE ucundan gelemez (o yalnız başlık döner) —
 * `useJournalEntry` ile detay çekilir ve form ancak veri geldikten sonra
 * kurulur. Aksi hâlde `useState` başlangıcı boş kalır ve gelen veri forma
 * hiç yansımazdı.
 */
export function JournalEntryFormModal({ entryId, onClose }: JournalEntryFormModalProps) {
  const entryQuery = useJournalEntry(entryId);

  if (entryId !== null) {
    if (entryQuery.isLoading) {
      return (
        <Modal title="Yevmiye Fişi Düzenle" onClose={onClose}>
          <p className="mu-notice" data-testid="mu-entry-dialog-loading">
            Fiş yükleniyor…
          </p>
        </Modal>
      );
    }
    if (entryQuery.isError || entryQuery.data === undefined) {
      return (
        <Modal title="Yevmiye Fişi Düzenle" onClose={onClose}>
          <p className="mu-notice mu-notice--danger" data-testid="mu-entry-dialog-load-error">
            {backendErrorMessage(entryQuery.error, "Fiş yüklenemedi.")}
          </p>
        </Modal>
      );
    }
    return <JournalEntryFormBody entry={entryQuery.data} onClose={onClose} />;
  }

  return <JournalEntryFormBody onClose={onClose} />;
}

function JournalEntryFormBody({
  entry,
  onClose,
}: {
  entry?: JournalEntryDetailResponse;
  onClose: () => void;
}) {
  const isEdit = entry !== undefined;
  // 🔴 SAVUNMACI: T2 `posted`/`reversed` fişte "Düzenle"yi zaten SUNMAZ, ama
  // diyalog başka bir yoldan açılırsa sunucunun 409'unu beklemeyiz.
  const isEditable = entry === undefined || entry.status === "draft";

  const [form, setForm] = useState<JournalEntryFormState>(() =>
    entry === undefined
      ? {
          // 📅 YEREL takvim; `toISOString()` UTC'ye kaydırırdı (TB5 dersi).
          entryDate: todayIsoDate(new Date()),
          description: "",
          detailNote: "",
          lines: initialJournalLines(),
        }
      : {
          entryDate: entry.entry_date,
          description: entry.description,
          detailNote: entry.detail_note ?? "",
          lines: draftsFromEntry(entry),
        },
  );
  const [nextKey, setNextKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const accountsQuery = useChartOfAccounts({ limit: CHART_ACCOUNTS_MAX_LIMIT });
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const replaceLinesMutation = useReplaceJournalLines();

  const accounts = useMemo(
    () => selectableLineAccounts(accountsQuery.data?.items),
    [accountsQuery.data],
  );
  // Katalog sayfasında olmayan bir hesabın adı fişin KENDİ satırından okunur.
  const knownLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of entry?.lines ?? []) {
      map.set(line.account_id, `${line.account_code} · ${line.account_name}`);
    }
    return map;
  }, [entry]);

  const totals = journalTotals(form.lines);
  const blockers = journalFormBlockers(form);
  const isPending =
    createMutation.isPending || updateMutation.isPending || replaceLinesMutation.isPending;
  const canSave = blockers.length === 0 && isEditable && !isPending;

  function updateLine(key: string, map: (line: JournalLineDraft) => JournalLineDraft) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? map(line) : line)),
    }));
  }

  function handleAdd() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, emptyJournalLine(`new-${nextKey}`)],
    }));
    setNextKey((value) => value + 1);
  }

  function handleRemove(key: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }

  function handleAmount(key: string, side: LineSide, raw: string) {
    updateLine(key, (line) => applyLineAmount(line, side, raw));
  }

  async function handleSubmit() {
    if (!canSave) return;
    setFormError(null);
    const lines = toJournalLineInputs(form.lines);

    if (entry === undefined) {
      try {
        // Oluşturmada satırlar AYNI istekte gider: iki adımlı yazma yoktur,
        // dolayısıyla kısmi başarısızlık da yoktur.
        await createMutation.mutateAsync({
          entry_date: form.entryDate,
          description: form.description.trim(),
          detail_note: form.detailNote.trim().length === 0 ? null : form.detailNote.trim(),
          lines: [...lines],
        });
        onClose();
      } catch (error) {
        setFormError(backendErrorMessage(error, "Fiş oluşturulamadı."));
      }
      return;
    }

    const fieldBody = changedEntryFields(form, entry);
    const hasFieldChanges = Object.keys(fieldBody).length > 0;
    const previousLines = toJournalLineInputs(draftsFromEntry(entry));
    const hasLineChanges = linesChanged(lines, previousLines);

    if (!hasFieldChanges && !hasLineChanges) {
      onClose();
      return;
    }

    // SIRA: önce başlık (`PATCH`), sonra satırlar (`PUT …/lines`). Satır yazımı
    // başlığın toplamlarını yeniden yazar; ters sırada `PATCH` başarısız olsaydı
    // toplamlar yeni, tarih eski kalırdı.
    if (hasFieldChanges) {
      try {
        await updateMutation.mutateAsync({ entryId: entry.id, body: fieldBody });
      } catch (error) {
        setFormError(backendErrorMessage(error, "Fiş güncellenemedi."));
        return;
      }
    }

    if (hasLineChanges) {
      try {
        await replaceLinesMutation.mutateAsync({ entryId: entry.id, lines });
      } catch (error) {
        const message = backendErrorMessage(error, "Fiş satırları kaydedilemedi.");
        // 🔴 KISMİ BAŞARISIZLIK SESSİZCE YUTULMAZ: başlık yazıldıysa kullanıcı
        // bunu bilmelidir, aksi hâlde diyaloğu kapatıp "hiçbir şey olmadı" sanır.
        setFormError(
          hasFieldChanges
            ? `Başlık güncellendi ancak satırlar kaydedilemedi: ${message}`
            : message,
        );
        return;
      }
    }
    onClose();
  }

  return (
    <Modal
      title={isEdit ? "Yevmiye Fişi Düzenle" : "Yeni Yevmiye Fişi"}
      className="mu-modal"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSave}
            data-testid="mu-entry-dialog-save"
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        {!isEditable && (
          <p className="mu-notice mu-notice--danger" data-testid="mu-entry-dialog-locked">
            {NOT_DRAFT_NOTICE}
          </p>
        )}
        <Field label="Tarih" required>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={form.entryDate}
              disabled={!isEditable}
              data-testid="mu-entry-date"
              onChange={(event) =>
                setForm((current) => ({ ...current, entryDate: event.target.value }))
              }
            />
          )}
        </Field>
        <Field label="Açıklama" required>
          {(control) => (
            <Input
              {...control}
              value={form.description}
              disabled={!isEditable}
              data-testid="mu-entry-description"
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          )}
        </Field>
        {/* E8:113'ün İKİNCİ satırı (`detail_note`) — serbest metindir, bir FK
            değildir; boşaltmak GERÇEK bir temizlemedir (kolon NULLABLE). */}
        <Field label="Alt Açıklama" hint="Dayanak / açıklama ikinci satırı">
          {(control) => (
            <Input
              {...control}
              value={form.detailNote}
              disabled={!isEditable}
              data-testid="mu-entry-detail-note"
              onChange={(event) =>
                setForm((current) => ({ ...current, detailNote: event.target.value }))
              }
            />
          )}
        </Field>
      </div>

      {accountsQuery.isError && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-entry-accounts-error">
          {backendErrorMessage(accountsQuery.error, "Hesap listesi yüklenemedi.")}
        </p>
      )}

      <JournalLinesEditor
        lines={form.lines}
        accounts={accounts}
        labelOf={(accountId) => knownLabels.get(accountId)}
        disabled={!isEditable || isPending}
        onAccountChange={(key, accountId) => updateLine(key, (line) => ({ ...line, accountId }))}
        onAmountChange={handleAmount}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      <JournalBalanceStrip totals={totals} />

      {blockers.length > 0 && (
        <ul className="mu-blockers" data-testid="mu-entry-dialog-blockers">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      )}
      {formError !== null && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-entry-dialog-error">
          {formError}
        </p>
      )}
    </Modal>
  );
}
