"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, Select } from "@/components/ui";
import { useSubcontractorContractOptions } from "@/lib/api/hooks/useSubcontractorContractOptions";
import { listTruncationMessage } from "@/lib/list-truncation";
import "./progress-payment-form.css";

/**
 * `/hakedisler/taseron/yeni` rotası `?contract=` sorgu parametresi OLMADAN
 * açıldığında gösterilen sözleşme seçim adımı. `useSubcontractorContractOptions`
 * (TB2/U1) DIŞINDA bir kaynak KULLANILMAZ.
 */
export function SubcontractorContractPickerStep() {
  const router = useRouter();
  const { options, isLoading, isError, isPartial, truncation } =
    useSubcontractorContractOptions();
  const [selected, setSelected] = useState("");

  function handleContinue() {
    if (!selected) return;
    router.push(`/hakedisler/taseron/yeni?contract=${selected}`);
  }

  return (
    <div className="pp-form">
      <h1 className="pp-form__title">Taşeron Hakediş Oluştur</h1>
      <p className="pp-form__message">Hakediş oluşturmak için önce bir sözleşme seçin.</p>

      {isLoading && <p className="pp-form__message">Yükleniyor…</p>}
      {isError && <p className="pp-form__message">Sözleşme listesi yüklenemedi.</p>}

      {!isLoading && !isError && options.length === 0 && (
        <p className="pp-form__message" data-testid="th-contract-picker-empty">
          Henüz kayıtlı taşeron sözleşmesi yok.
        </p>
      )}

      {/* F-P5 T1 — TB3 sayfalaması: sunucu tavanı aşıldıysa aranan sözleşme bu
          kutuda HİÇ OLMAYABİLİR; sessiz kırpma yasak. */}
      {!isLoading && !isError && isPartial && (
        <p className="pp-form__limit-note" data-testid="th-contract-picker-limit-note">
          {listTruncationMessage(truncation)} Aradığınız sözleşme listede olmayabilir.
        </p>
      )}

      {!isLoading && !isError && options.length > 0 && (
        <div className="pp-form__header-card">
          <Field label="Taşeron Sözleşmesi" required>
            {(control) => (
              <Select
                {...control}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Seçiniz</option>
                {options.map((option) => (
                  <option key={option.contractId} value={option.contractId}>
                    {option.subcontractorName}
                    {option.contractNo ? ` — ${option.contractNo}` : ""} ({option.projectName})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="pp-form__actions">
            <Button variant="primary" onClick={handleContinue} disabled={!selected}>
              Devam Et
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
