import { EQUIPMENT_EMPTY_VALUE } from "@/components/equipment/equipment-labels";

export type DetailKvTone = "mono" | "warning" | "success" | "muted";

export interface DetailKvProps {
  label: string;
  /** `null` ⇒ değer yok; `EQUIPMENT_EMPTY_VALUE` basılır, UYDURMA `0` DEĞİL. */
  value: string | null;
  tones?: DetailKvTone[];
  testId?: string;
}

/** MD `.kv` satırı (MD:20-24) — Teknik/Kiralama/Bakım kartlarının ortak öğesi. */
export function DetailKv({ label, value, tones = [], testId }: DetailKvProps) {
  const isEmpty = value === null;
  const applied = isEmpty ? ["muted" as const] : tones;
  return (
    <div className="makine-det__kv">
      <span className="makine-det__k">{label}</span>
      <span
        className={["makine-det__v", ...applied.map((t) => `makine-det__v--${t}`)].join(" ")}
        data-testid={testId}
      >
        {isEmpty ? EQUIPMENT_EMPTY_VALUE : value}
      </span>
    </div>
  );
}
