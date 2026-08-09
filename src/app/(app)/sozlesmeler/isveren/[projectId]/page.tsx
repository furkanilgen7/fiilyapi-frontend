import { Suspense } from "react";

import { EmployerContractDetailView } from "@/components/contracts/EmployerContractDetailView";

// F-P5 T3 · E14 · İşveren sözleşme detayı. Segment PROJE kimliğidir (proje
// başına tek işveren sözleşmesi; SZL satırı da `item.id` olarak proje
// kimliğini geçirir). `useSearchParams` kullanan istemci bileşen Suspense
// sınırında sarılır (Next 15 kanonu, `sozlesmeler/page.tsx` emsali).
export default async function EmployerContractPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense>
      <EmployerContractDetailView projectId={projectId} />
    </Suspense>
  );
}
