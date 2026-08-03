"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, Button, Field, Select } from "@/components/ui";
import { useSubcontractorContractOptions } from "@/lib/api/hooks/useSubcontractorContractOptions";
import { listTruncationMessage } from "@/lib/list-truncation";
import "./progress-payment-form.css";

/**
 * `/hakedisler/taseron/yeni` rotası `?contract=` sorgu parametresi OLMADAN
 * açıldığında gösterilen sözleşme seçim adımı (brief §1 — KULLANICI KARARI,
 * bağlayıcı). `useSubcontractorContractOptions` DIŞINDA bir kaynak
 * KULLANILMAZ — türetme mantığı burada TEKRARLANMAZ.
 *
 * Sınır ekranda GÖRÜNÜR olmalı (brief): kalıcı bilgi notu HER ZAMAN basılır
 * (kapatılamaz), boş durumda birebir metin basılır.
 */
export function SubcontractorContractPickerStep() {
  const router = useRouter();
  const { options, isLoading, isError, truncation } = useSubcontractorContractOptions();
  const [selected, setSelected] = useState("");

  function handleContinue() {
    if (!selected) return;
    router.push(`/hakedisler/taseron/yeni?contract=${selected}`);
  }

  return (
    <div className="pp-form">
      <h1 className="pp-form__title">Taşeron Hakediş Oluştur</h1>
      <p className="pp-form__message">Hakediş oluşturmak için önce bir sözleşme seçin.</p>

      {/* Kalıcı bilgi notu — kapatılamaz, sınırın kendisi (brief §1). */}
      <Alert variant="info" data-testid="th-contract-picker-note">
        Bu liste, sözleşme LİSTE ucu henüz eklenmediği için mevcut hakedişlerden türetiliyor —
        yalnızca en az bir hakedişi olan sözleşmeler görünür.
      </Alert>

      {/* Final inceleme F-3: türetmenin kaynağı olan hakediş listesi sunucu
          tavanında kırpıldıysa seçenek listesi de EKSİKTİR — bu sessizce
          yutulmaz, aranan sözleşme listede yoksa kullanıcı NEDENİNİ görür. */}
      {truncation.isTruncated && (
        <Alert variant="warning" data-testid="th-contract-picker-truncated">
          {listTruncationMessage(truncation)} Aradığınız sözleşme listede olmayabilir.
        </Alert>
      )}

      {isLoading && <p className="pp-form__message">Yükleniyor…</p>}
      {isError && <p className="pp-form__message">Sözleşme listesi yüklenemedi.</p>}

      {!isLoading && !isError && options.length === 0 && (
        <p className="pp-form__message" data-testid="th-contract-picker-empty">
          Henüz hakedişi olmayan sözleşmeler burada listelenemiyor; sözleşme listesi ucu
          eklendiğinde tamamı görünecek.
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
