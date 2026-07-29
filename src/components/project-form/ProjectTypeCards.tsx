import { useId } from "react";
import type { ProjectType } from "./types";

interface TypeOption {
  value: ProjectType;
  emoji: string;
  title: string;
  desc: string;
}

/** Metinler mockup satır 56–74'ten birebir (spec §4.3). */
const OPTIONS: readonly TypeOption[] = [
  {
    value: "taahhut",
    emoji: "🏗",
    title: "Taahhüt",
    desc: "İşveren adına iş yaparsın, gelir hakediş ile alınır",
  },
  {
    value: "kendi_yatirim",
    emoji: "🏠",
    title: "Kendi Yatırım",
    desc: "Arsa senin, daire satarsın",
  },
  {
    value: "kat_karsiligi",
    emoji: "🤝",
    title: "Kat Karşılığı",
    desc: "Arsa sahibinin, karşılığında ünite payı alırsın",
  },
];

interface ProjectTypeCardsProps {
  value: ProjectType;
  onChange: (value: ProjectType) => void;
}

/**
 * Proje Tipi ikon kartları (mockup satır 50–77). Gerçek radio grubu: radyolar
 * görsel olarak gizli, kart `<label>`; native grup ok-tuşu gezinmesini sağlar,
 * `:focus-visible` halkası karta uygulanır (§7.8). `role` uydurulmaz.
 */
export function ProjectTypeCards({ value, onChange }: ProjectTypeCardsProps) {
  const groupName = useId();
  return (
    <div className="pf-type__grid" role="radiogroup" aria-label="Proje Tipi">
      {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <label
              key={opt.value}
              className={`pf-type-card${selected ? " pf-type-card--selected" : ""}`}
            >
              <input
                className="pf-type-card__input"
                type="radio"
                name={groupName}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
              />
              <span className="pf-type-card__emoji" aria-hidden="true">
                {opt.emoji}
              </span>
              <span className="pf-type-card__title">{opt.title}</span>
              <span className="pf-type-card__desc">{opt.desc}</span>
            </label>
          );
        })}
    </div>
  );
}
