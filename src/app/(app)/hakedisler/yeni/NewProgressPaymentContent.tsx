"use client";

import { useSearchParams } from "next/navigation";

import { ProgressPaymentForm } from "@/components/progress-payments/ProgressPaymentForm";
import { ProjectPickerStep } from "@/components/progress-payments/ProjectPickerStep";

// `?project=` sorgu parametresi yoksa proje seçtiren ara adım basılır
// (brief §Belirsizlik çözümü 2) — boş form gösterilmez.
export function NewProgressPaymentContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  if (!projectId) return <ProjectPickerStep />;
  return <ProgressPaymentForm mode="create" projectId={projectId} />;
}
