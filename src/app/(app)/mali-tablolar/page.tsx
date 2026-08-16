import { FinancialStatementsHomeView } from "@/components/financial-statements/FinancialStatementsHomeView";

/**
 * F-MT T4 · `/mali-tablolar` KÖK ekranı (mockup E11 · `Ekran 11 - Mali
 * Tablo.dc.html`).
 *
 * 🔴 ROTANIN VARLIK GEREKÇESİ (T2'den devralındı, hâlâ geçerli):
 * `/mali-tablolar/bilanco` yazılınca `mali-tablolar` klasörü DOĞDU ve
 * `[...slug]` catch-all'ı bu dalı ARTIK YAKALAMIYOR — kök yol `not-found`a
 * (gerçek 404) düşerdi. Üç canlı bağlantı buraya gelir: BL:33/NA:33
 * breadcrumb'ı, BL:27 sidebar üst öğesi ve `accounting-nav-config` kardeş
 * bağlantısı.
 *
 * 🔴 T2'nin `ComingSoon` yer tutucusu KALDIRILDI: ekran artık E11'in
 * iskeletini basıyor, veri yüzeyleri ise DEVRE DIŞI + görünür (ve kayıttan
 * TÜREYEN) gerekçelidir — gelir tablosu ucu ayrı bir backend diliminde
 * (MT-2) gelecek.
 *
 * 🔴 Bu rota drill sidebar'ı BASMAZ (E11:36-58 tam kabuk menüsünü çiziyor);
 * grup `layout.tsx`i BİLEREK yoktur, iki yaprak ekran sidebar'ı kendi içinde
 * basar.
 */
export default function MaliTablolarPage() {
  return <FinancialStatementsHomeView />;
}
