import { SettingsHeader } from "@/components/settings/shell/SettingsHeader";
import { NotificationsScreen } from "@/components/settings/notifications/NotificationsScreen";

export default function BildirimlerPage() {
  return (
    <>
      <SettingsHeader title="Bildirim Ayarları" subtitle="Hangi olaylar için nasıl bildirim alacağınızı ayarlayın" />
      <NotificationsScreen />
    </>
  );
}
