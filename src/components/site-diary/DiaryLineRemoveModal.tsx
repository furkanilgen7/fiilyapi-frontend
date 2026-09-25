"use client";

import { Modal } from "@/components/settings/Modal";
import { Button } from "@/components/ui/button/Button";
import { formatDateDots, formatQuantity } from "@/lib/format";
import { subtractDecimalStrings } from "@/lib/decimal";

import type { DiaryItemGroup, DiaryLeafRow } from "./diary-lines-tree";

export interface DiaryLineRemoveModalProps {
  group: DiaryItemGroup;
  leaf: DiaryLeafRow;
  entryDate: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Ek Formlar M2(b) · miktar girilmiş bölümlü satırı kaldırma onayı (G6).
 * Metin kuralı: satırın MİKTARI silinir, o iş koduna dağıtılmış SAAT KORUNUR.
 * Kaldırma günlük kaydedilince yazılır (gövde `removed`).
 *
 * Mockup'taki "Bugün kazanılmış" satırı ve "bu koda X sa dağıtılmış" sayısı
 * planlama (EV) verisidir — çekirdek onu bilmez (spec §2.7); cümle sayısız
 * basılır.
 */
export function DiaryLineRemoveModal({ group, leaf, entryDate, onConfirm, onClose }: DiaryLineRemoveModalProps) {
  const afterRemoval =
    leaf.cumulative !== null && leaf.todayValue !== null
      ? subtractDecimalStrings(leaf.cumulative, leaf.todayValue)
      : null;
  return (
    <Modal
      title={`${leaf.label} satırı kaldırılsın mı?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Satırı kaldır
          </Button>
        </>
      }
    >
      <p className="diary-remove__lead">
        <strong>
          {group.description} · {leaf.label}
        </strong>{" "}
        · {formatDateDots(entryDate)}. Bu satırın miktarı silinir; Saat Dağıtımı&apos;nda bu iş koduna
        dağıtılmış saatler KORUNUR.
      </p>
      <dl className="diary-remove__summary">
        <div>
          <dt>Bugün</dt>
          <dd>
            {formatQuantity(leaf.todayValue)} {group.unit}
          </dd>
        </div>
        <div>
          <dt>Kümülatif (kaldırılınca)</dt>
          <dd>
            {formatQuantity(leaf.cumulative)} → {formatQuantity(afterRemoval)}
          </dd>
        </div>
      </dl>
      <p className="diary-remove__warning">
        Bu koda dağıtılmış saat korunur. Harcanan gerçektir: o gün bu kodda miktar kalmadığı için saat
        &quot;atanamayan&quot; olarak raporlanır.
      </p>
    </Modal>
  );
}
