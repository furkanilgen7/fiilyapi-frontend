import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { IntegrationsScreen } from "@/components/settings/integrations/IntegrationsScreen";

export default function EntegrasyonlarPage() {
  return (
    <>
      <SettingsHeader title="Entegrasyonlar" subtitle="Dış sistemler ve servislerle bağlantı kurun" />
      <IntegrationsScreen />
    </>
  );
}
