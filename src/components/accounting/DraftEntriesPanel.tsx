"use client";

import { Badge, Button } from "@/components/ui";
import type { JournalEntryResponse } from "@/lib/api/hooks/useJournalEntries";
import { formatAmount, formatDateDots } from "@/lib/format";

import { entryActions, journalStatusLabel, journalStatusVariant } from "./accounting-labels";

interface DraftEntriesPanelProps {
  entries: readonly JournalEntryResponse[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  /** Yazma yetkisi yoksa eylemler solgun basılır (SİLİNMEZ). */
  canWrite: boolean;
  writeDisabledReason: string;
  /** İşlem sürerken çift tıklamayı kapatır. */
  busyEntryId: string | null;
  onEdit: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onPost: (entryId: string) => void;
  onReverse: (entryId: string) => void;
}

const COLUMN_COUNT = 6;

/**
 * 🔴 **ONAYLI SAPMA ADAYI** — bu panel E8'de ÇİZİLİ DEĞİLDİR.
 *
 * Gerekçe yapısaldır: `draft` fişler deftere (`/journal`) GİRMEZ, dolayısıyla
 * "+ Yevmiye Kaydı" (E8:67) diyaloğunun ürettiği kayıt ekranın HİÇBİR
 * YERİNDE görünmezdi — kullanıcı az önce açtığı taslağı bulup
 * kayıtlaştıramazdı. `GET /journal-entries` ucunun şema açıklaması aynı
 * boşluğu kendi diliyle anlatır (K-Ş4).
 *
 * Eylem görünürlüğü `entryActions`tan gelir (yönetim kararı 2): `posted`
 * fişte düzenle/sil HİÇ SUNULMAZ — sunucu 409 verir ve her zaman patlayan bir
 * düğme kullanıcıya var olmayan bir yetenek vaat ederdi.
 */
export function DraftEntriesPanel({
  entries,
  isLoading,
  errorMessage,
  canWrite,
  writeDisabledReason,
  busyEntryId,
  onEdit,
  onDelete,
  onPost,
  onReverse,
}: DraftEntriesPanelProps) {
  return (
    <section className="mu-panel" aria-label="Taslak Fişler">
      <div className="mu-panel__head">
        <span className="mu-panel__title">Taslak Fişler</span>
        <span className="mu-table__note">
          Taslak fişler deftere girmez; kayıtlaştırılınca yevmiye defterinde görünür.
        </span>
      </div>
      <div className="mu-panel__body">
        {!canWrite && (
          <p className="mu-notice" data-testid="mu-drafts-write-notice">
            {writeDisabledReason}
          </p>
        )}
        <div className="mu-table-scroll">
          <table className="mu-table">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Açıklama</th>
                <th scope="col" className="is-right">
                  Borç Toplamı
                </th>
                <th scope="col" className="is-right">
                  Alacak Toplamı
                </th>
                <th scope="col">Durum</th>
                <th scope="col" className="is-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {errorMessage !== undefined && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="mu-table__state mu-table__state--danger"
                    data-testid="mu-drafts-error"
                  >
                    {errorMessage}
                  </td>
                </tr>
              )}
              {errorMessage === undefined && isLoading && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="mu-table__state"
                    data-testid="mu-drafts-loading"
                  >
                    Taslak fişler yükleniyor…
                  </td>
                </tr>
              )}
              {errorMessage === undefined &&
                !isLoading &&
                entries !== undefined &&
                entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMN_COUNT}
                      className="mu-table__state"
                      data-testid="mu-drafts-empty"
                    >
                      Bu dönemde taslak fiş yok.
                    </td>
                  </tr>
                )}
              {errorMessage === undefined &&
                entries?.map((entry) => {
                  const actions = entryActions(entry.status);
                  const isBusy = busyEntryId === entry.id;
                  const disabled = !canWrite || isBusy;
                  return (
                    <tr key={entry.id} data-testid={`mu-draft-row-${entry.id}`}>
                      <td className="mu-table__meta is-mono">{formatDateDots(entry.entry_date)}</td>
                      <td>
                        <div className="mu-table__desc">{entry.description}</div>
                        {entry.detail_note !== null && entry.detail_note.length > 0 && (
                          <div className="mu-table__note">{entry.detail_note}</div>
                        )}
                      </td>
                      <td className="is-right is-mono">
                        <span className="mu-amount--debit">{formatAmount(entry.total_debit)}</span>
                      </td>
                      <td className="is-right is-mono">
                        <span className="mu-amount--credit">{formatAmount(entry.total_credit)}</span>
                      </td>
                      <td>
                        <Badge variant={journalStatusVariant(entry.status)}>
                          {journalStatusLabel(entry.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="mu-actions-cell">
                          {actions.canEdit && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={disabled}
                              data-testid={`mu-draft-edit-${entry.id}`}
                              onClick={() => onEdit(entry.id)}
                            >
                              Düzenle
                            </Button>
                          )}
                          {actions.canPost && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={disabled}
                              data-testid={`mu-draft-post-${entry.id}`}
                              onClick={() => onPost(entry.id)}
                            >
                              Kayıtlaştır
                            </Button>
                          )}
                          {actions.canReverse && (
                            <Button
                              variant="warning"
                              size="sm"
                              disabled={disabled}
                              data-testid={`mu-draft-reverse-${entry.id}`}
                              onClick={() => onReverse(entry.id)}
                            >
                              Storno
                            </Button>
                          )}
                          {actions.canDelete && (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={disabled}
                              data-testid={`mu-draft-delete-${entry.id}`}
                              onClick={() => onDelete(entry.id)}
                            >
                              Sil
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
