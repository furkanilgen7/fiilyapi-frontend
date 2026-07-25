import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { AppearanceScreen } from "@/components/settings/appearance/AppearanceScreen";

export default function GorunumPage() {
  return (
    <>
      <SettingsHeader title="Görünüm Ayarları" subtitle="Tema, dil ve arayüz tercihlerinizi ayarlayın" />
      <AppearanceScreen />
    </>
  );
}
