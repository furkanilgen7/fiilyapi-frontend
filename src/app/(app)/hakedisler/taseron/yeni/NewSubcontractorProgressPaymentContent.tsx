"use client";

import { useSearchParams } from "next/navigation";

import { SubcontractorContractPickerStep } from "@/components/progress-payments/SubcontractorContractPickerStep";
import { SubcontractorProgressPaymentForm } from "@/components/progress-payments/SubcontractorProgressPaymentForm";

// `?contract=` sorgu parametresi yoksa sözleşme seçtiren ara adım basılır
// (brief §1, kullanıcı kararı — bağlayıcı) — `NewProgressPaymentContent`
// (İşveren `?project=`) ile AYNI desen.
export function NewSubcontractorProgressPaymentContent() {
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contract");

  if (!contractId) return <SubcontractorContractPickerStep />;
  return <SubcontractorProgressPaymentForm mode="create" contractId={contractId} />;
}
