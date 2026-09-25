import { UnitRateCatalogScreen } from "@/components/earned-value/catalog/UnitRateCatalogScreen";

// PLN-F1 · `/planlama/birim-oran-katalogu` — şirket geneli (şantiye yok).
// [...slug] catch-all'ı bu segment için devre dışı bırakır.
export default function BirimOranKataloguPage() {
  return <UnitRateCatalogScreen />;
}
