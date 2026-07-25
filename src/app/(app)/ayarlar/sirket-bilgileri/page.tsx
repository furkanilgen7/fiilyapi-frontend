import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { CompanyScreen } from "@/components/settings/company/CompanyScreen";

export default function SirketBilgileriPage() {
  return (
    <>
      <SettingsHeader title="Şirket Bilgileri" subtitle="Firma bilgilerini ve iletişim ayarlarını yönetin" />
      <CompanyScreen />
    </>
  );
}
