"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  Toggle,
  Badge,
  Alert,
  Card,
  type ButtonVariant,
  type ButtonSize,
} from "@/components/ui";
import { EyeIcon } from "@/components/ui/icons";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "light-blue",
  "success",
  "danger",
  "warning",
  "ghost",
];
const SIZES: ButtonSize[] = ["sm", "md", "lg", "xl"];

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(true);
  const [toggled, setToggled] = useState(true);

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "var(--space-8)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-12)",
      }}
    >
      <h1 style={{ fontSize: "var(--text-page-title)", fontWeight: 700, letterSpacing: "var(--tracking-tight)" }}>
        Tasarim Sistemi — Primitive&apos;ler
      </h1>

      <section data-testid="section-buttons" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600 }}>Button</h2>
        {SIZES.map((size) => (
          <div key={size} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button disabled>disabled</Button>
        </div>
      </section>

      <section data-testid="section-inputs" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 360 }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600 }}>Input & Select</h2>
        <Input aria-label="Normal" placeholder="Normal" />
        <Input aria-label="Hata" placeholder="Hata" status="error" />
        <Input aria-label="Basari" placeholder="Basari" status="success" />
        <Input aria-label="Devre disi" placeholder="Devre disi" disabled />
        <Input aria-label="Ikonlu" placeholder="Ikonlu" leftIcon={<EyeIcon />} />
        <Input aria-label="Tutar" placeholder="0,00" numeric rightIcon={<span>TL</span>} />
        <Select aria-label="Sehir" defaultValue="ist">
          <option value="ist">Istanbul</option>
          <option value="ank">Ankara</option>
        </Select>
      </section>

      <section data-testid="section-controls" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600 }}>Checkbox / Radio / Toggle</h2>
        <Checkbox label="Kabul ediyorum" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <Checkbox label="Devre disi" disabled />
        <Radio name="g" label="Secenek A" defaultChecked />
        <Radio name="g" label="Secenek B" />
        <Toggle label="Bildirimler" checked={toggled} onChange={(e) => setToggled(e.target.checked)} />
        <Toggle label="Devre disi" disabled />
      </section>

      <section data-testid="section-badges" style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, width: "100%" }}>Badge</h2>
        <Badge variant="neutral">Notr</Badge>
        <Badge variant="primary">Birincil</Badge>
        <Badge variant="success">Onayli</Badge>
        <Badge variant="warning">Beklemede</Badge>
        <Badge variant="danger">Reddedildi</Badge>
        <Badge variant="danger" shape="count">3</Badge>
      </section>

      <section data-testid="section-alerts" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 480 }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600 }}>Alert</h2>
        <Alert type="info" title="Bilgi">Bir bilgilendirme mesaji.</Alert>
        <Alert type="success" title="Basarili">Islem tamamlandi.</Alert>
        <Alert type="warning" title="Uyari">Dikkat edilmesi gereken durum.</Alert>
        <Alert type="danger" title="Hata">Bir sorun olustu.</Alert>
      </section>

      <section data-testid="section-cards" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, marginBottom: "var(--space-4)" }}>Card</h2>
        <Card title="Kart Basligi" actions={<Button size="sm" variant="ghost">Duzenle</Button>}>
          Kart govdesi icerigi burada yer alir.
        </Card>
      </section>
    </main>
  );
}
