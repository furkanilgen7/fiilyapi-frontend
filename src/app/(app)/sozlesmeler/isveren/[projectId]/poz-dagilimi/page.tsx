import { ContractDistributionView } from "@/components/contracts/ContractDistributionView";

// F-P5 T4 · POZ · İşveren sözleşmesi poz dağılımı ızgarası. Segment PROJE
// kimliğidir (proje başına TEK işveren sözleşmesi — E14 ile aynı kural).
// `useSearchParams` KULLANILMAZ, bu yüzden Suspense sınırı gerekmez.
export default async function ContractDistributionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ContractDistributionView projectId={projectId} />;
}
