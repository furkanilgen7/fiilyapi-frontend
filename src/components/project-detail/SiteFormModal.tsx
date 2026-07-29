"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { useCreateSite } from "@/lib/api/hooks/useSiteMutations";
import type { SiteCreateRequest } from "@/lib/api/hooks/useSiteMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { BackendError } from "@/lib/api/unwrap";
// Mockup'siz tek yuzey — Ayarlar form kanonu (settings-form) birebir izlenir:
// settings-form sinifi settings.css'ten, etiket katmani ui/field/Field'den gelir.
import "@/components/settings/settings.css";

interface SiteFormModalProps {
  projectId: string;
  onClose: () => void;
}

type SiteStatus = SiteCreateRequest["status"];

const DUPLICATE_CODE_MESSAGE =
  "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.";

export function SiteFormModal({ projectId, onClose }: SiteFormModalProps) {
  const createSite = useCreateSite(projectId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<SiteStatus>("active");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  // Şantiye şefi bu dilimde serbest metin — backend alanı site_manager_name,
  // Personel modülü gelince select'e baglanacak (onayli erteleme, sapma degil).
  const [siteManagerName, setSiteManagerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createSite.isPending;

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
    createSite.mutate(
      {
        name,
        // Kod bos birakilirsa alan hic gonderilmez — backend turetir (brief).
        ...(code.trim() ? { code: code.trim() } : {}),
        status,
        address: address || null,
        city: city || null,
        site_manager_name: siteManagerName || null,
        start_date: startDate || null,
        end_date: endDate || null,
        delivery_date: deliveryDate || null,
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
      title="Yeni Şantiye"
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
              onChange={(e) => setStatus(e.target.value as SiteStatus)}
            >
              <option value="active">Aktif</option>
              <option value="on_hold">Beklemede</option>
              <option value="completed">Tamamlandı</option>
            </Select>
          )}
        </Field>
        <Field label="Adres">
          {(control) => (
            <Input {...control} value={address} onChange={(e) => setAddress(e.target.value)} />
          )}
        </Field>
        <Field label="Şehir">
          {(control) => (
            <Input {...control} value={city} onChange={(e) => setCity(e.target.value)} />
          )}
        </Field>
        <Field label="Şantiye Şefi">
          {(control) => (
            <Input
              {...control}
              value={siteManagerName}
              onChange={(e) => setSiteManagerName(e.target.value)}
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
        <Field label="Teslim Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          )}
        </Field>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
