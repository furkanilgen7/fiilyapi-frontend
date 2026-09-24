"use client";

import { Modal } from "@/components/settings/Modal";
import { ErrorCard, ReadOnlyStrip, Skeleton, SkeletonRows } from "@/components/earned-value/common/state";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { EMPTY_CELL } from "@/lib/format";
import type { EvDisciplineRead } from "@/lib/api/models";

import { ContractorBadge, DisciplineSwatch } from "./CatalogBits";

interface DisciplineListModalProps {
  disciplines: readonly EvDisciplineRead[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Disiplin başına katalog iş tipi sayısı; katalog yüklenmediyse null (sil kapalı kalır). */
  itemCounts: ReadonlyMap<string, number> | null;
  /** B1-8: full ve üstü — ekle / düzenle. */
  canWrite: boolean;
  /** B1-9: admin — sil. */
  canDelete: boolean;
  toast: string | null;
  onAdd: () => void;
  onEdit: (discipline: EvDisciplineRead) => void;
  onDelete: (discipline: EvDisciplineRead) => void;
  onClose: () => void;
}

/** Katalog iskeleti ile aynı ölçü (KAT:384 · M6:381). */
const SKELETON_COLUMNS = "1fr 60px 70px 50px";
const SKELETON_ROWS = 3;

/**
 * M6:147-221 — "Disiplinler" liste modalı.
 *
 * "Kullanan" sütunu: API `DisciplineRead` kullanım sayısı TAŞIMIYOR. İş tipi
 * sayısı katalogdan türetilir. ŞANTİYE SAYISI BASILMAZ (M6:192 alt satırı yok)
 * — kaynak: CEO kararı (f), PLN-F1.5. Backend `DisciplineRead`'e
 * `used_by_item_count` + `used_by_site_count` ekleyecek (PLN-B2); F2.1 devrinde
 * bu sütun o alanlara bağlanır. Sil yalnız iş tipi sayısı 0 iken açıktır; başka kullanım
 * (BOQ grubu eşlemesi, baseline) varsa backend 409 döner ve onay modalında
 * gösterilir (B1-9).
 */
export function DisciplineListModal({
  disciplines,
  isLoading,
  isError,
  onRetry,
  itemCounts,
  canWrite,
  canDelete,
  toast,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: DisciplineListModalProps) {
  const footer = (
    <Button variant="secondary" onClick={onClose}>
      Kapat
    </Button>
  );

  return (
    <Modal title="Disiplinler" onClose={onClose} footer={footer} className="ev-cat-modal--list">
      <div className="ev-cat-modal__intro">
        <p className="ev-cat-modal__subtitle">Şirket listesi · bütün şantiyelerde ve katalogda ortak</p>
        {canWrite && <Button onClick={onAdd}>+ Yeni disiplin</Button>}
      </div>
      <div className="ev-cat-modal__body">
        {!canWrite && (
          <ReadOnlyStrip>Salt okunur · disiplin listesini yalnız tam yetki (full) değiştirir</ReadOnlyStrip>
        )}
        {toast && (
          <div className="ev-cat-toast ev-cat-toast--inline" role="status">
            {toast}
          </div>
        )}
        {isLoading && (
          <Skeleton label="Disiplinler yükleniyor">
            <SkeletonRows columns={SKELETON_COLUMNS} count={SKELETON_ROWS} />
          </Skeleton>
        )}
        {isError && (
          <ErrorCard
            title="Disiplinler yüklenemedi"
            description="Liste değişmedi. Bağlantıyı kontrol edip tekrar deneyin."
            onRetry={onRetry}
          />
        )}
        {disciplines && disciplines.length === 0 && (
          <div className="ev-cat-empty">
            <div className="ev-cat-empty__swatches" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="ev-cat-empty__title">Disiplin yok</div>
            <p className="ev-cat-empty__text">
              İş tipi eklemek ve bütçede BOQ gruplarını eşlemek için önce disiplin ekleyin.
            </p>
          </div>
        )}
        {disciplines && disciplines.length > 0 && (
          <DisciplineTable
            disciplines={disciplines}
            itemCounts={itemCounts}
            canWrite={canWrite}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        <div className="ev-cat-dlist__foot">
          {/* M6:214 ikinci yarısı ("… eşlenmiş şantiye") BASILMAZ — şantiye sayısı gösterilmiyor (CEO kararı f). */}
          <span>Kullanan = bu disipline bağlı iş tipi</span>
          <span>{canWrite ? "Sil yalnız kullanılmayan disiplinde açıktır" : "Değişiklik için tam yetki gerekir"}</span>
        </div>
      </div>
    </Modal>
  );
}

interface DisciplineTableProps {
  disciplines: readonly EvDisciplineRead[];
  itemCounts: ReadonlyMap<string, number> | null;
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (discipline: EvDisciplineRead) => void;
  onDelete: (discipline: EvDisciplineRead) => void;
}

function DisciplineTable({ disciplines, itemCounts, canWrite, canDelete, onEdit, onDelete }: DisciplineTableProps) {
  return (
    <div className="ev-cat-dlist">
      <table>
        <colgroup>
          <col className="ev-cat-dlist__col-code" />
          <col />
          <col className="ev-cat-dlist__col-own" />
          <col className="ev-cat-dlist__col-used" />
          <col className="ev-cat-dlist__col-act" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Renk · kod</th>
            <th scope="col">Ad</th>
            <th scope="col">Vars. Kendi/Taş.</th>
            <th scope="col" className="ev-cat-num">
              Kullanan
            </th>
            <th scope="col">{canWrite ? "Eylem" : ""}</th>
          </tr>
        </thead>
        <tbody>
          {disciplines.map((discipline) => {
            const count = itemCounts?.get(discipline.id) ?? (itemCounts ? 0 : null);
            // Sayı bilinmiyorsa (katalog yüklenmedi) güvenli taraf: kullanımda say.
            const isInUse = count === null || count > 0;
            return (
              <tr key={discipline.id}>
                <td>
                  <span className="ev-cat-dlist__code">
                    <DisciplineSwatch color={discipline.color} />
                    {discipline.code}
                  </span>
                </td>
                <td className="ev-cat-dlist__name">{discipline.name}</td>
                <td>
                  <ContractorBadge type={discipline.default_contractor_type} />
                </td>
                <td>
                  <span className="ev-cat-dlist__used">
                    <span className={cx("ev-cat-dlist__used-main", count === 0 && "ev-cat-dlist__used-main--zero")}>
                      {`${count ?? EMPTY_CELL} iş tipi`}
                    </span>
                  </span>
                </td>
                <td>
                  {canWrite && (
                    <span className="ev-cat-dlist__acts">
                      <span className="ev-cat-dlist__btns">
                        <button type="button" className="ev-cat-link ev-cat-link--edit" onClick={() => onEdit(discipline)}>
                          Düzenle
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className="ev-cat-link ev-cat-link--delete"
                            disabled={isInUse}
                            onClick={() => onDelete(discipline)}
                          >
                            Sil
                          </button>
                        )}
                      </span>
                      {canDelete && isInUse && <span className="ev-cat-dlist__reason">Kullanımda · silinemez</span>}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
