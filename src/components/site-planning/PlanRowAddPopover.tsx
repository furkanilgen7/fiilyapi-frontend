"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Field } from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import type { PlanResourceKind } from "@/lib/api/hooks/useSitePlan";

import type { PlanDraftGroup } from "./plan-draft";
import type { PlanDraftNewRow } from "./plan-draft-reducer";
import { PlanPopover } from "./PlanPopover";

/** Satır etiketi tavanı — ızgaranın etiket sütunu 140px'tir (P109). */
const MAX_ROW_LABEL = 60;
/** İşçi sayısı tavanı: mockup'ın en kalabalık ekibi 18 kişi (P139); 999 pay bırakır. */
const MAX_WORKER_COUNT = 999;

export interface PlanRowAddPopoverProps {
  group: PlanDraftGroup;
  onSubmit: (row: PlanDraftNewRow) => void;
  onClose: () => void;
}

/**
 * "+ Satır" (F-PL T3, spec §3 onaylı tasarım).
 *
 * Tür seçilebilir tutuldu (spec §3: "etiket + işçi sayısı + bölüm/ekipman
 * türü"), ama backend kuralı burada UYGULANIR: tür "ekipman" seçilirse satır
 * bölüme BAĞLANMAZ (`section_id: null`, aksi halde 422) ve işçi sayısı alanı
 * kapanır — ekipman satırında işçi sayısı kavramı yoktur (P162).
 */
export function PlanRowAddPopover({ group, onSubmit, onClose }: PlanRowAddPopoverProps) {
  const [kind, setKind] = useState<PlanResourceKind>(group.kind);
  const [label, setLabel] = useState("");
  const [workerCount, setWorkerCount] = useState("");

  const isEquipment = kind === "equipment";
  const parsedCount = Number.parseInt(workerCount, 10);

  return (
    <PlanPopover label="Yeni plan satırı" onClose={onClose} className="plan-pop--row">
      <form
        className="plan-pop__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (label.trim().length === 0) return;
          onSubmit({
            kind,
            sectionId: isEquipment ? null : group.sectionId,
            label: label.trim(),
            plannedWorkerCount: isEquipment || Number.isNaN(parsedCount) ? null : parsedCount,
          });
        }}
      >
        <Field label="Tür">
          {(control) => (
            <Select
              {...control}
              size="row"
              value={kind}
              onChange={(event) => setKind(event.target.value as PlanResourceKind)}
            >
              <option value="crew">Ekip</option>
              <option value="equipment">Makine / Ekipman</option>
            </Select>
          )}
        </Field>

        <Field label="Etiket" required>
          {(control) => (
            <Input
              {...control}
              size="row"
              value={label}
              maxLength={MAX_ROW_LABEL}
              placeholder={isEquipment ? "Örn. Tower Crane" : "Örn. Kalıpçı"}
              onChange={(event) => setLabel(event.target.value)}
            />
          )}
        </Field>

        <Field
          label="İşçi sayısı"
          hint={isEquipment ? "Ekipman satırında işçi sayısı tutulmaz." : undefined}
        >
          {(control) => (
            <Input
              {...control}
              size="row"
              numeric
              type="number"
              min={0}
              max={MAX_WORKER_COUNT}
              value={workerCount}
              disabled={isEquipment}
              onChange={(event) => setWorkerCount(event.target.value)}
            />
          )}
        </Field>

        <div className="plan-pop__actions">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" size="sm" disabled={label.trim().length === 0}>
            Ekle
          </Button>
        </div>
      </form>
    </PlanPopover>
  );
}
