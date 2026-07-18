import ComingSoon from "@/components/shell/ComingSoon";
import { moduleNameForSlug } from "@/components/shell/nav-config";

// Next 15: params bir Promise'tir.
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const moduleName = moduleNameForSlug(slug[0] ?? "");
  return <ComingSoon moduleName={moduleName} />;
}
