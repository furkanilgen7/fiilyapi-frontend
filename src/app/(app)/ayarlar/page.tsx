import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

// /ayarlar → ilk sekme.
export default function AyarlarIndexPage() {
  redirect(routes.settings.users());
}
