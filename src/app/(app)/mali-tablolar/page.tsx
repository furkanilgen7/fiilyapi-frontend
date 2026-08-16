import ComingSoon from "@/components/shell/ComingSoon";
import { moduleNameForSlug } from "@/components/shell/nav-config";

/**
 * F-MT T2 · `/mali-tablolar` KÖK ekranı — DAVRANIŞ DEĞİŞTİRMEYEN köprü dosyası.
 *
 * 🔴 NEDEN VAR: `/mali-tablolar/bilanco` rotası yazılınca `mali-tablolar`
 * klasörü DOĞDU ve `[...slug]` catch-all'ı bu dalı ARTIK YAKALAMIYOR — kök yol
 * `not-found`a (gerçek 404) düşüyordu. Kırılanlar ölçüldü: BL:33 breadcrumb'ı
 * (`← Mali Tablolar`), BL:27 sidebar üst öğesi ve HP:38'den beri duran
 * `accounting-nav-config` kardeş bağlantısı — üçü de aynı yola gider ve
 * `accounting-nav-config.test.ts`in kırık-link bekçisi bunu kırmızıya çevirdi.
 *
 * Bu dosya catch-all'ın BASTIĞI ŞEYİN AYNISINI basar: davranış bir piksel bile
 * değişmez, yalnız 404 yerine eskisi gibi `ComingSoon` görünür. Kök ekranın
 * GERÇEK tasarımı (mockup E11) AYRI bir görevin işidir ve bu gövdeyi
 * değiştirecektir — burada hiçbir yüzey İCAT EDİLMEZ.
 *
 * 🔴 Bu rota drill sidebar'ı BASMAZ (E11 onu çizmiyor); sidebar'ı
 * `BalanceSheetView` kendi içinde basar, grup `layout.tsx`i BİLEREK yoktur.
 */
export default function MaliTablolarPage() {
  return <ComingSoon moduleName={moduleNameForSlug("mali-tablolar")} />;
}
