import { redirect } from "next/navigation";

// /ayarlar → ilk sekme.
export default function AyarlarIndexPage() {
  redirect("/ayarlar/kullanicilar");
}
