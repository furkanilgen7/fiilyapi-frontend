"use client";

import { useState } from "react";

import { Field, Input, Select } from "@/components/ui";
import { useEmployers, type EmployerListItem } from "@/lib/api/hooks/useEmployers";
import { EmployerFormModal } from "./EmployerFormModal";

export interface EmployerValues {
  /** Secili isverenin id'si — bos ise henuz secim yapilmamis. */
  employerId: string;
}

/** Baslangic degerleri (mockup'ta secim yok). */
export function emptyEmployerValues(): EmployerValues {
  return { employerId: "" };
}

// Native <option> degerlerinde UUID ile çakışmayan ayırt edici sentinel.
const NEW_EMPLOYER_OPTION = "__new__";

interface EmployerCardProps {
  values: EmployerValues;
  onChange: <K extends keyof EmployerValues>(field: K, value: EmployerValues[K]) => void;
  /** İşveren seçici hatası (§4.10; F12 doldurur). */
  error?: string;
}

/**
 * İşveren Bilgileri kartı (mockup satır 94–102, spec §4.6). Yalnız taahhüt
 * (rozet zaten bunu söylüyor) — görünürlük kararı bu bileşenin dışında
 * (parent/TypeFieldGroups, F12'nin işi).
 *
 * VKN ve Yetkili Kişi burada düzenlenmez: seçilen işverenin kayıtlı
 * değerleridir (işveren kartoteksi tek kaynak). Seçim yokken ikisi boş +
 * disabled; seçim varken readOnly (doldurulmuş ama değiştirilemez).
 */
export function EmployerCard({ values, onChange, error }: EmployerCardProps) {
  const { data } = useEmployers();
  const employers = data?.items ?? [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Yeni olusturulan isveren, liste yeniden cekilip invalidate sonucu
  // guncellenene kadar burada tutulur ki secim aninda gorunsun (F7 testleri).
  const [justCreated, setJustCreated] = useState<EmployerListItem | null>(null);

  const selectedEmployer =
    employers.find((e) => e.id === values.employerId) ??
    (justCreated && justCreated.id === values.employerId ? justCreated : undefined);

  function handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (next === NEW_EMPLOYER_OPTION) {
      setIsModalOpen(true);
      return;
    }
    onChange("employerId", next);
  }

  function handleCreated(employer: EmployerListItem) {
    setJustCreated(employer);
    onChange("employerId", employer.id);
    setIsModalOpen(false);
  }

  return (
    <section className="pf-card pf-card--employer">
      <h2 className="pf-card__title">
        🏢 İşveren Bilgileri
        <span className="pf-badge-employer">Taahhüt projesi</span>
      </h2>

      <div className="pf-grid pf-grid--2-1-1">
        <Field label="İşveren Firma" required error={error}>
          {(control) => (
            <Select
              {...control}
              value={values.employerId}
              status={error ? "error" : "default"}
              onChange={handleSelectChange}
            >
              <option value="">Seçiniz veya yeni ekle…</option>
              {employers.map((employer) => (
                <option key={employer.id} value={employer.id}>
                  {employer.name}
                </option>
              ))}
              {/* Liste henuz invalidate/refetch'i tamamlamadiysa yeni isveren
                  gecici olarak burada gorunur (asagida kaldirilir). */}
              {justCreated && !employers.some((e) => e.id === justCreated.id) && (
                <option value={justCreated.id}>{justCreated.name}</option>
              )}
              <option value={NEW_EMPLOYER_OPTION}>+ Yeni İşveren Ekle</option>
            </Select>
          )}
        </Field>
        <Field label="VKN">
          {(control) => (
            <Input
              {...control}
              numeric
              readOnly={Boolean(selectedEmployer)}
              disabled={!selectedEmployer}
              value={selectedEmployer?.tax_number ?? ""}
            />
          )}
        </Field>
        <Field label="Yetkili Kişi">
          {(control) => (
            <Input
              {...control}
              readOnly={Boolean(selectedEmployer)}
              disabled={!selectedEmployer}
              value={selectedEmployer?.contact_person ?? ""}
            />
          )}
        </Field>
      </div>

      {isModalOpen && (
        <EmployerFormModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </section>
  );
}
