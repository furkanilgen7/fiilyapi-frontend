/**
 * F-MT T4 · E11 (`Ekran 11 - Mali Tablo.dc.html`) kök ekranının BEKLEYEN
 * YÜZEYLERİNİN kayıt anahtarları. Aşağıdaki sayılar O dosyanın SATIR
 * numaralarıdır.
 *
 * 🔴 NEDEN SADECE ANAHTAR: F-PRJTAB kanonu — görünür gerekçe öğenin YANINA
 * SABİTLENMEZ, `pending-modules` kaydından TÜRETİLİR. Sabitlenmiş bir not, uç
 * açıldıktan sonra ekranda YAŞAMAYA DEVAM EDER ve çalışan bir yüzeyle
 * ÇELİŞİR; rota bekçileri `href`e bakar, düzyazıya bakmaz — bu yüzden hiçbir
 * bekçinin göremeyeceği bir çürüme sınıfıdır.
 *
 * 🔴 ÖLÇÜM (bu dilimde yeniden yapıldı): `src/lib/api/schema.d.ts` içinde
 * `income-statement|IncomeStatement|profit-loss|ProfitLoss|gelir-tablosu`
 * için **SIFIR** eşleşme vardır. MT-1 backend dilimi YALNIZ `/balance-sheet`
 * ve `/cash-flow-statement` uçlarını açtı. E11'in üç veri yüzeyi de (tablo +
 * iki özet kartı) o olmayan uçtan beslenir; sayı İCAT EDİLMEZ.
 */

/** E11:87-147 — `Gelir Tablosu` tablosu. */
export const INCOME_STATEMENT_REASON = "income_statement";

/** E11:71 — `PDF İndir`. */
export const INCOME_STATEMENT_EXPORT_REASON = "income_statement_export";

/** E11:76-81 — dönem gezgini. */
export const INCOME_STATEMENT_PERIOD_REASON = "income_statement_period";

/** E11:82 — proje süzgeci. */
export const PROJECT_FILTER_REASON = "financial_statements_project_filter";

/** E11:151-167 — `Performans Özeti`. */
export const PERFORMANCE_SUMMARY_REASON = "financial_performance_summary";

/** E11:169-189 — `Proje Bazlı Karlılık`. */
export const PROJECT_PROFITABILITY_REASON = "project_profitability";
