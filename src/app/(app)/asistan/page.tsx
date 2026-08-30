import { AiPanel } from "@/components/ai/AiPanel";

// AI-1 · FİİL AI Asistanı (`projedesign/AI Chat.dc.html`) gerçek rotası.
//
// 🔴 Segment `/asistan`, `/ai` DEĞİL — ölçülmüş gerekçe: `src/app/(app)/<ad>/`
// açmak `<ad>`i `internal-url-guard.test.ts`in KORUNAN KÖK kümesine sokar. Kök
// `ai` olsaydı, BFF rotasındaki üst-kaynak yol sabiti (`"/ai/chat"`) o bekçi
// tarafından "elle kurulmuş uygulama içi URL" sayılır ve kırmızı olurdu.
// Mockup'ın başlığı da zaten "FİİL AI Asistanı"dır.
export default function AsistanPage() {
  return <AiPanel />;
}
