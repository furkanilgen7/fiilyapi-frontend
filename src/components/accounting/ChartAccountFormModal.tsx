"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button, Field, Input, Select, Toggle } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";
import {
  useCreateChartAccount,
  useUpdateChartAccount,
} from "@/lib/api/hooks/useChartOfAccountMutations";
import type { ChartAccountType } from "@/lib/api/hooks/useChartOfAccounts";

import {
  ACCOUNT_TYPE_OPTIONS,
  chartAccountFormBlockers,
  chartAccountFormOf,
  changedChartAccountFields,
  emptyChartAccountForm,
  type ChartAccountFormState,
} from "./chart-account-form";
import "@/components/settings/settings.css";
import "./accounting.css";

export interface ChartAccountFormModalProps {
  /** `undefined` ⇒ oluşturma kipi. */
  account?: ChartAccountResponse;
  onClose: () => void;
}

const CODE_HINT = "Grup 10 · ana hesap 100 · alt hesap 100.01";

/**
 * HP:50 `+ Hesap Ekle` / satır `Düzenle` diyaloğu.
 *
 * 🔴 DÖRT alan: `Kod` · `Hesap Adı` · `Tür` · `Durum`. `Bakiye` (HP:61) TÜREV
 * olduğu için formda YOKTUR — salt-okunur bile basılmaz, çünkü diyalogda
 * görünen her sayı "kaydedilecek" okunur.
 *
 * 🔴 İstemci doğrulaması sunucununkinin YERİNE geçmez: kod deseni burada da
 * denetlenir (kullanıcı 422'yi beklemeden görsün) ama sunucunun 409/422 Türkçe
 * `detail` metni yine EKRANA basılır (`backendErrorMessage`; ham gövde ya da
 * `detail` nesnesi asla).
 */
export function ChartAccountFormModal({ account, onClose }: ChartAccountFormModalProps) {
  const isEdit = account !== undefined;
  const [form, setForm] = useState<ChartAccountFormState>(() =>
    account ? chartAccountFormOf(account) : emptyChartAccountForm(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateChartAccount();
  const updateMutation = useUpdateChartAccount();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const blockers = chartAccountFormBlockers(form);
  const canSave = blockers.length === 0 && !isPending;

  function patch(next: Partial<ChartAccountFormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function handleSubmit() {
    if (!canSave) return;
    setFormError(null);
    try {
      if (account === undefined) {
        await createMutation.mutateAsync({
          code: form.code.trim(),
          name: form.name.trim(),
          account_type: form.accountType,
          is_active: form.isActive,
        });
      } else {
        const body = changedChartAccountFields(form, account);
        // Hiçbir alan değişmediyse istek ATILMAZ.
        if (Object.keys(body).length === 0) {
          onClose();
          return;
        }
        await updateMutation.mutateAsync({ accountId: account.id, body });
      }
      onClose();
    } catch (error) {
      // Diyalog AÇIK kalır: kullanıcı doldurduğu formu kaybetmeden hatayı görür.
      setFormError(
        backendErrorMessage(error, isEdit ? "Hesap güncellenemedi." : "Hesap oluşturulamadı."),
      );
    }
  }

  return (
    <Modal
      title={isEdit ? "Hesap Düzenle" : "Yeni Hesap"}
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
            data-testid="hp-dialog-save"
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <Field label="Kod" required hint={CODE_HINT}>
          {(control) => (
            <Input
              {...control}
              value={form.code}
              data-testid="hp-dialog-code"
              onChange={(event) => patch({ code: event.target.value })}
            />
          )}
        </Field>
        <Field label="Hesap Adı" required>
          {(control) => (
            <Input
              {...control}
              value={form.name}
              data-testid="hp-dialog-name"
              onChange={(event) => patch({ name: event.target.value })}
            />
          )}
        </Field>
        <Field label="Tür" required>
          {(control) => (
            <Select
              {...control}
              value={form.accountType}
              data-testid="hp-dialog-type"
              onChange={(event) => patch({ accountType: event.target.value as ChartAccountType })}
            >
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {/* HP:62 `Durum` — kaldırma yolu DELETE değil `is_active`tir (repo kanonu). */}
        <Toggle
          label="Kullanımda"
          checked={form.isActive}
          data-testid="hp-dialog-active"
          onChange={(event) => patch({ isActive: event.target.checked })}
        />
        {blockers.length > 0 && (
          <ul className="mu-blockers" data-testid="hp-dialog-blockers">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
        {formError !== null && (
          <p className="settings-note settings-note--error" data-testid="hp-dialog-error">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  );
}
