import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { PayrollRatesScreen } from "@/components/settings/payroll-rates/PayrollRatesScreen";

export default function BordroOranlariPage() {
  return (
    <>
      <SettingsHeader
        variant="sub"
        title="Bordro Oranları"
        subtitle="Yıl bazlı SGK, vergi ve kesinti oranları — bordro hesabı bu değerleri kullanır"
      />
      <PayrollRatesScreen />
    </>
  );
}
