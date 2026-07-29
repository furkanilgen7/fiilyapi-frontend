"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { useCreateSection } from "@/lib/api/hooks/useSectionMutations";
import type { SectionCreateRequest } from "@/lib/api/hooks/useSectionMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { BackendError } from "@/lib/api/unwrap";
// SiteFormModal (Task 7) kanonu birebir izlenir: settings-form sinifi
// settings.css'ten, etiket katmani ui/field/Field'den gelir.
import "@/components/settings/settings.css";

interface SectionFormModalProps {
  siteId: string;
  onClose: () => void;
}

type SectionStatus = SectionCreateRequest["status"];

const DUPLICATE_CODE_MESSAGE =
  "Bu bölüm kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.";

export function SectionFormModal({ siteId, onClose }: SectionFormModalProps) {
  const createSection = useCreateSection(siteId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<SectionStatus>("planned");
  const [managerName, setManagerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createSection.isPending;

  function validate(): string | null {
    if (!name.trim()) return "Ad zorunludur.";
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    createSection.mutate(
      {
        name,
        // Kod bos birakilirsa alan hic gonderilmez (SiteFormModal deseni).
        ...(code.trim() ? { code: code.trim() } : {}),
        status,
        ...(managerName.trim() ? { manager_name: managerName.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        sort_order: Number(sortOrder) || 0,
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          if (err instanceof BackendError && err.status === 409) {
            setFormError(DUPLICATE_CODE_MESSAGE);
            return;
          }
          setFormError(backendErrorMessage(err));
        },
      },
    );
  }

  return (
    <Modal
      title="Yeni Bölüm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <Field label="Ad" required>
          {(control) => (
            <Input {...control} value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
        <Field label="Kod" hint="Boş bırakılırsa kod otomatik oluşturulur.">
          {(control) => (
            <Input {...control} value={code} onChange={(e) => setCode(e.target.value)} />
          )}
        </Field>
        <Field label="Durum" required>
          {(control) => (
            <Select
              {...control}
              value={status}
              onChange={(e) => setStatus(e.target.value as SectionStatus)}
            >
              <option value="planned">Planlandı</option>
              <option value="active">Aktif — Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
            </Select>
          )}
        </Field>
        <Field label="Sorumlu">
          {(control) => (
            <Input
              {...control}
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Başlangıç Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Bitiş Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Sıra" required>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          )}
        </Field>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
