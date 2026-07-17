# Frontend F1 — Primitive'ler Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F0 iskeletinin üstüne token-tabanlı, erişilebilir primitive bileşen kütüphanesini (8 aile) + showcase sayfası + davranış ve görsel regresyon testlerini kurmak.

**Architecture:** Her primitive `src/components/ui/<name>/` altında co-located `.tsx` + `.css` + `index.ts` olarak yaşar; yalnızca `tokens.css` custom property'lerini kullanır (çıplak hex yasak). Bileşenler `forwardRef` + native prop passthrough + `variant`/`size` string prop'larıyla yazılır. `/design-system` showcase sayfası hepsini render eder; Vitest+RTL davranışı, Playwright @1280px görseli test eder.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · ham CSS + tokens.css · Vitest + React Testing Library · @playwright/test (yeni, yalnız görsel regresyon) · pnpm.

**Kanon:** `fiilyapi-backend/docs/superpowers/specs/2026-07-17-temel-modul-design.md` §6 ve `frontend/docs/superpowers/specs/2026-07-17-frontend-f1-primitives-design.md`. Renk/ölçü değerleri Task 1'de token'lara girer; primitive CSS'leri yalnız token kullanır.

## Global Constraints

- **Repo:** Tüm yollar `/Users/furkanilgen/Documents/Projeler/insaat/frontend` köküne göre. Backend AYRI repo, DOKUNULMAZ.
- **Paket yöneticisi:** yalnızca `pnpm`. `npm`/`yarn` yok; yalnız `pnpm-lock.yaml` commit edilir. Yeni bağımlılık YALNIZ `@playwright/test` ve `@testing-library/user-event`.
- **Stil:** Tailwind YASAK. Ham CSS + `tokens.css` custom property'leri. Bileşen CSS'inde **çıplak hex YASAK** — her renk/ölçü token'dan gelir (hover-türevi ve saf beyaz `#fff` istisnaları dokümante edilir).
- **Tema:** Açık tema kanon. `prefers-color-scheme: dark` YOK. Animasyon yalnız `transform`/`opacity`.
- **Dil:** Kod/değişken/fonksiyon/bileşen/dosya adları İngilizce. Kullanıcıya dönen metin (showcase etiketleri) + yorumlar Türkçe.
- **Erişilebilirlik:** semantik HTML; native `<button>`/`<input type=checkbox>`/`role="switch"`; label ilişkisi; görünür focus (focus-ring token).
- **Dosya boyutu:** tek dosya ≤ 400 satır.
- **Hedef:** masaüstü ≥1280px.
- **Commit:** her task sonunda; başlık İngilizce `<type>: <desc>`, Türkçe özel karakter yok (feat/test/ci/chore).
- **Test:** TDD — önce kırmızı test. Kapılar: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; F1'den itibaren `pnpm test:visual` (Playwright).
- **Secret:** yok.

---

## File Structure

| Dosya | Sorumluluk |
|---|---|
| `src/styles/tokens.css` | (Modify) §6.1 tam token seti |
| `src/app/layout.tsx` | (Modify) JetBrains Mono weight'lerine 700 ekle |
| `src/lib/cx.ts` | className birleştirici (küçük yerel yardımcı, bağımlılık yok) |
| `src/lib/cx.test.ts` | cx testi |
| `src/components/ui/icons/index.tsx` | Yerel inline SVG ikon bileşenleri |
| `src/components/ui/button/{Button.tsx,button.css,index.ts}` | Button primitive |
| `src/components/ui/input/{Input.tsx,input.css,index.ts}` | Input primitive |
| `src/components/ui/select/{Select.tsx,select.css,index.ts}` | Select primitive |
| `src/components/ui/checkbox/{Checkbox.tsx,Radio.tsx,checkbox.css,index.ts}` | Checkbox + Radio |
| `src/components/ui/toggle/{Toggle.tsx,toggle.css,index.ts}` | Toggle |
| `src/components/ui/badge/{Badge.tsx,badge.css,index.ts}` | Badge |
| `src/components/ui/alert/{Alert.tsx,alert.css,index.ts}` | Alert |
| `src/components/ui/card/{Card.tsx,card.css,index.ts}` | Card |
| `src/components/ui/index.ts` | Barrel — tüm primitive'leri dışa aktarır |
| `src/components/ui/**/*.test.tsx` | Her primitive için Vitest+RTL davranış testi |
| `src/app/design-system/page.tsx` | Showcase — tüm primitive'ler |
| `playwright.config.ts` | Playwright yapılandırması (@1280px, chromium) |
| `e2e/visual.spec.ts` | Görsel regresyon snapshot'ları |
| `.github/workflows/ci.yml` | (Modify) görsel job |

---

## Task 1: Token genişletme + `cx` yardımcısı + font 700

**Files:**
- Modify: `src/styles/tokens.css`, `src/app/layout.tsx`, `src/styles/tokens.test.ts`
- Create: `src/lib/cx.ts`, `src/lib/cx.test.ts`

**Interfaces:**
- Consumes: F0 `tokens.css`, `layout.tsx`
- Produces:
  - `cx(...args: Array<string | false | null | undefined>): string` — truthy sınıfları boşlukla birleştirir
  - Genişletilmiş token seti: `--text-page-title`, `--text-section`, `--text-body`, `--text-small`, `--text-table-head`, `--text-numeric`, `--tracking-tight`, `--tracking-wide`, `--radius-6/8/10/14`, `--shadow-card`, `--shadow-topbar`, `--focus-ring`, `--color-surface-2`, `--color-divider`, `--color-text-strong`, `--color-label`, `--color-*-soft`, `--anim-fade-up`, `--sidebar-width`

- [ ] **Step 1: `cx` için başarısız test yaz**

`src/lib/cx.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("truthy siniflari boslukla birlestirir", () => {
    expect(cx("a", "b")).toBe("a b");
  });
  it("false/null/undefined degerleri atlar", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });
  it("hicbir gecerli sinif yoksa bos string doner", () => {
    expect(cx(false, null, undefined)).toBe("");
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/lib/cx.test.ts`
Expected: FAIL — `./cx` yok.

- [ ] **Step 3: `cx` yardımcısını yaz**

`src/lib/cx.ts`:

```typescript
/** Truthy className parcalarini boslukla birlestirir. Bagimlilik yok. */
export function cx(
  ...args: Array<string | false | null | undefined>
): string {
  return args.filter(Boolean).join(" ");
}
```

- [ ] **Step 4: `tokens.test.ts`'i yeni token'lar için genişlet**

`src/styles/tokens.test.ts` içindeki tipografi/boşluk/yarıçap `it` bloğunun token listesine ekle (mevcut assertion'lar korunur):

```typescript
    for (const token of [
      "--font-sans",
      "--font-mono",
      "--text-base",
      "--text-lg",
      "--space-4",
      "--radius-md",
      // F1 eklemeleri
      "--text-page-title",
      "--text-section",
      "--text-numeric",
      "--text-table-head",
      "--radius-14",
      "--shadow-card",
      "--focus-ring",
      "--color-surface-2",
      "--color-divider",
      "--anim-fade-up",
    ]) {
      expect(tokensCss).toContain(token);
    }
```

- [ ] **Step 5: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/styles/tokens.test.ts`
Expected: FAIL — yeni token'lar yok.

- [ ] **Step 6: `tokens.css`'i §6.1 tam setine genişlet**

`src/styles/tokens.css` `:root` bloğuna ekle (mevcut F0 token'ları korunur). Değerler kanon §6.1:

```css
  /* F1: tipografi olcegi (§6.1) — boyut/agirlik/izleme */
  --text-page-title: 26px;      /* sayfa basligi 26/700 ls -0.5 */
  --text-section: 16px;         /* bolum basligi 16/600 */
  --text-body: 13px;            /* govde 13/400 */
  --text-small: 11px;           /* kucuk 11/400 */
  --text-table-head: 11px;      /* tablo basligi 11/600 uppercase ls 0.8 */
  --text-numeric: 22px;         /* sayisal 22/700 Mono */
  --tracking-tight: -0.5px;
  --tracking-wide: 0.8px;

  /* F1: radius olcegi (§6.1) */
  --radius-6: 6px;
  --radius-8: 8px;
  --radius-10: 10px;
  --radius-14: 14px;

  /* F1: golgeler (§6.1 — sabitlenmis .06) */
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.06);
  --shadow-topbar: 0 1px 3px rgba(0, 0, 0, 0.06);
  --focus-ring: 0 0 0 3px rgba(37, 99, 235, 0.1);

  /* F1: ek yuzey/ayirici/metin renkleri (§6.1) */
  --color-surface-2: #f8fafc;   /* ikincil yuzey */
  --color-divider: #f1f5f9;     /* ayirici */
  --color-text-strong: #0f172a;
  --color-label: #475569;       /* sabitlenmis label rengi */

  /* F1: yumusak zeminler (badge/alert) */
  --color-primary-soft: #dbeafe;
  --color-success-soft: #dcfce7;
  --color-warning-soft: #fef3c7;
  --color-danger-soft: #fee2e2; /* sabitlenmis kirmizi zemin */
  --color-neutral-soft: #f1f5f9;

  /* F1: layout sabitleri (F3'te kullanilir) */
  --sidebar-width: 220px;

  /* F1: animasyon */
  --anim-fade-up: fadeUp 0.4s ease;
```

Ve dosya sonuna (`:root` dışına) keyframes ekle:

```css
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

> Not: F0'da `--color-primary-soft`, `--color-success-soft`, `--color-warning-soft`, `--color-danger-soft` ZATEN tanımlıysa (F0 tokens.css'inde bazıları vardı) tekrar tanımlama — yalnız eksik olanları ekle. `--color-warning` F0'da `#d97706`; §6.1 uyarı `#f59e0b` — kanon geçerli, F0 değerini `#f59e0b` olarak güncelle (`--color-warning-soft: #fef3c7` uyumlu).

- [ ] **Step 7: JetBrains Mono 700 ağırlığını yükle**

`src/app/layout.tsx` — `JetBrains_Mono` çağrısına `weight` ekle:

```tsx
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "600", "700"],
});
```

> Not: `next/font/google` variable font varsayılanı tüm ağırlıkları içerir; `weight` dizisi 400/600/700'ün geldiğini garanti eder. Build'de font optimizasyonu hatasızsa doğrudur.

- [ ] **Step 8: Testlerin geçtiğini ve build'in çalıştığını doğrula**

Run: `pnpm test src/lib/cx.test.ts src/styles/tokens.test.ts`
Expected: hepsi PASS.

Run: `pnpm build`
Expected: `✓ Compiled successfully` — font 700 optimizasyonu hatasız.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: extend design tokens, add cx helper and Mono 700"
```

---

## Task 2: Button (4 boyut × 7 varyant)

**Files:**
- Create: `src/components/ui/button/Button.tsx`, `src/components/ui/button/button.css`, `src/components/ui/button/index.ts`
- Test: `src/components/ui/button/Button.test.tsx`
- Modify: `package.json` (`@testing-library/user-event` ekle)

**Interfaces:**
- Consumes: `cx` (Task 1), tokens (Task 1)
- Produces: `Button` bileşeni — props `{ variant?: ButtonVariant; size?: ButtonSize } & React.ButtonHTMLAttributes<HTMLButtonElement>`; `ButtonVariant = "primary" | "secondary" | "light-blue" | "success" | "danger" | "warning" | "ghost"`; `ButtonSize = "sm" | "md" | "lg" | "xl"`. Varsayılan `variant="primary"`, `size="md"`. `forwardRef<HTMLButtonElement>`.

- [ ] **Step 1: user-event ekle**

Run: `pnpm add -D @testing-library/user-event@^14`
Expected: `pnpm-lock.yaml` güncellenir.

- [ ] **Step 2: Başarısız testi yaz**

`src/components/ui/button/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("cocuklari bir button rolunde render eder", () => {
    render(<Button>Kaydet</Button>);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument();
  });

  it("varsayilan olarak primary+md siniflarini uygular", () => {
    render(<Button>X</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--primary");
    expect(btn.className).toContain("btn--md");
  });

  it("variant ve size prop'larini sinifa cevirir", () => {
    render(
      <Button variant="danger" size="lg">
        Sil
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn--danger");
    expect(btn.className).toContain("btn--lg");
  });

  it("onClick'i tetikler ve disabled iken tetiklemez", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Tikla</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Tikla
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disaridan gelen className'i birlestirir", () => {
    render(<Button className="extra">X</Button>);
    expect(screen.getByRole("button").className).toContain("extra");
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/button/Button.test.tsx`
Expected: FAIL — `./Button` yok.

- [ ] **Step 4: Button bileşenini yaz**

`src/components/ui/button/Button.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./button.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "light-blue"
  | "success"
  | "danger"
  | "warning"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx("btn", `btn--${variant}`, `btn--${size}`, className)}
      {...rest}
    />
  ),
);

Button.displayName = "Button";
```

- [ ] **Step 5: `button.css`'i yaz (yalnız token)**

`src/components/ui/button/button.css`:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
  border-radius: var(--radius-8);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Boyutlar */
.btn--sm { padding: var(--space-1) var(--space-3); font-size: var(--text-small); }
.btn--md { padding: var(--space-2) var(--space-4); font-size: var(--text-body); }
.btn--lg { padding: var(--space-3) var(--space-6); font-size: var(--text-base); }
.btn--xl { padding: var(--space-4) var(--space-8); font-size: var(--text-lg); }

/* Varyantlar (ana renkler token; hover-turevi degerler istisna) */
.btn--primary { background: var(--color-primary); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }

.btn--secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border-strong); }
.btn--secondary:hover:not(:disabled) { background: var(--color-surface-2); }

.btn--light-blue { background: var(--color-primary-soft); color: var(--color-primary); }
.btn--light-blue:hover:not(:disabled) { background: #cfe0fd; }

.btn--success { background: var(--color-success); color: #fff; }
.btn--success:hover:not(:disabled) { background: #15803d; }

.btn--danger { background: var(--color-danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }

.btn--warning { background: var(--color-warning); color: #fff; }
.btn--warning:hover:not(:disabled) { background: #d97706; }

.btn--ghost { background: transparent; color: var(--color-text-muted); }
.btn--ghost:hover:not(:disabled) { background: var(--color-surface-2); color: var(--color-text); }
```

`src/components/ui/button/index.ts`:

```typescript
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";
```

- [ ] **Step 6: Testin geçtiğini doğrula**

Run: `pnpm test src/components/ui/button/Button.test.tsx`
Expected: PASS (5/5).

Run: `pnpm typecheck`
Expected: temiz.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Button primitive with 7 variants and 4 sizes"
```

---

## Task 3: Icons + Input + Select

**Files:**
- Create: `src/components/ui/icons/index.tsx`, `src/components/ui/input/{Input.tsx,input.css,index.ts}`, `src/components/ui/select/{Select.tsx,select.css,index.ts}`
- Test: `src/components/ui/input/Input.test.tsx`, `src/components/ui/select/Select.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens
- Produces:
  - Icons: `EyeIcon`, `EyeOffIcon`, `ChevronDownIcon`, `AlertIcon`, `CheckIcon`, `XIcon` — her biri `(props: React.SVGProps<SVGSVGElement>) => JSX.Element`, 16×16, `aria-hidden`
  - `Input` — props `{ status?: "default" | "error" | "success"; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; numeric?: boolean } & React.InputHTMLAttributes<HTMLInputElement>`; `forwardRef<HTMLInputElement>`
  - `Select` — props `{ status?: "default" | "error" | "success" } & React.SelectHTMLAttributes<HTMLSelectElement>`; `forwardRef<HTMLSelectElement>`; sağda chevron ikon

- [ ] **Step 1: İkonları yaz**

`src/components/ui/icons/index.tsx`:

```tsx
type IconProps = React.SVGProps<SVGSVGElement>;

// Ortak SVG nitelikleri (mockup inline SVG kalibi)
const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.06 6.06A13.16 13.16 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 5.94-2.06" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
```

- [ ] **Step 2: Input başarısız testini yaz**

`src/components/ui/input/Input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("bir textbox render eder ve yazmayi kabul eder", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Ad" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Ad" }), "ab");
    expect(onChange).toHaveBeenCalled();
  });

  it("error durumunda hata sinifini uygular", () => {
    render(<Input aria-label="Ad" status="error" />);
    expect(screen.getByRole("textbox").className).toContain("input--error");
  });

  it("numeric iken mono sinifini uygular", () => {
    render(<Input aria-label="Tutar" numeric />);
    expect(screen.getByRole("textbox").className).toContain("input--numeric");
  });

  it("sol ikonu render eder", () => {
    render(<Input aria-label="Ara" leftIcon={<span data-testid="ic" />} />);
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("disabled iken devre disidir", () => {
    render(<Input aria-label="Ad" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/input/Input.test.tsx`
Expected: FAIL — `./Input` yok.

- [ ] **Step 4: Input'u yaz**

`src/components/ui/input/Input.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./input.css";

export type InputStatus = "default" | "error" | "success";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  status?: InputStatus;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ status = "default", leftIcon, rightIcon, numeric, className, ...rest }, ref) => (
    <span className={cx("input-wrap", leftIcon && "input-wrap--left", rightIcon && "input-wrap--right")}>
      {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
      <input
        ref={ref}
        className={cx(
          "input",
          status !== "default" && `input--${status}`,
          numeric && "input--numeric",
          className,
        )}
        {...rest}
      />
      {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
    </span>
  ),
);

Input.displayName = "Input";
```

`src/components/ui/input/input.css`:

```css
.input-wrap { position: relative; display: inline-flex; align-items: center; width: 100%; }
.input {
  width: 100%;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-2) var(--space-3);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input::placeholder { color: var(--color-text-subtle); }
.input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
.input:disabled { background: var(--color-surface-2); color: var(--color-text-muted); cursor: not-allowed; }
.input--error { border-color: var(--color-danger); }
.input--error:focus { box-shadow: 0 0 0 3px var(--color-danger-soft); }
.input--success { border-color: var(--color-success); }
.input--numeric { font-family: var(--font-mono); font-variant-numeric: tabular-nums; text-align: right; }

.input-wrap--left .input { padding-left: var(--space-8); }
.input-wrap--right .input { padding-right: var(--space-8); }
.input-icon { position: absolute; display: inline-flex; color: var(--color-text-muted); pointer-events: none; }
.input-icon--left { left: var(--space-3); }
.input-icon--right { right: var(--space-3); }
```

`src/components/ui/input/index.ts`:

```typescript
export { Input } from "./Input";
export type { InputProps, InputStatus } from "./Input";
```

- [ ] **Step 5: Select başarısız testini yaz**

`src/components/ui/select/Select.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("secenekleri bir combobox olarak render eder", () => {
    render(
      <Select aria-label="Sehir" defaultValue="ist">
        <option value="ist">Istanbul</option>
        <option value="ank">Ankara</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Sehir" })).toHaveValue("ist");
  });

  it("error durumunda hata sinifini uygular", () => {
    render(
      <Select aria-label="Sehir" status="error">
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox").className).toContain("select--error");
  });

  it("disabled iken devre disidir", () => {
    render(
      <Select aria-label="Sehir" disabled>
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
```

- [ ] **Step 6: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/select/Select.test.tsx`
Expected: FAIL — `./Select` yok.

- [ ] **Step 7: Select'i yaz**

`src/components/ui/select/Select.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import { ChevronDownIcon } from "@/components/ui/icons";
import "./select.css";

export type SelectStatus = "default" | "error" | "success";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  status?: SelectStatus;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ status = "default", className, children, ...rest }, ref) => (
    <span className="select-wrap">
      <select
        ref={ref}
        className={cx("select", status !== "default" && `select--${status}`, className)}
        {...rest}
      >
        {children}
      </select>
      <span className="select-chevron">
        <ChevronDownIcon />
      </span>
    </span>
  ),
);

Select.displayName = "Select";
```

`src/components/ui/select/select.css`:

```css
.select-wrap { position: relative; display: inline-flex; align-items: center; width: 100%; }
.select {
  width: 100%;
  appearance: none;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.select:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
.select:disabled { background: var(--color-surface-2); color: var(--color-text-muted); cursor: not-allowed; }
.select--error { border-color: var(--color-danger); }
.select--success { border-color: var(--color-success); }
.select-chevron {
  position: absolute; right: var(--space-3);
  display: inline-flex; color: var(--color-text-muted); pointer-events: none;
}
```

`src/components/ui/select/index.ts`:

```typescript
export { Select } from "./Select";
export type { SelectProps, SelectStatus } from "./Select";
```

- [ ] **Step 8: Tüm testlerin geçtiğini doğrula**

Run: `pnpm test src/components/ui/input src/components/ui/select`
Expected: PASS.

Run: `pnpm typecheck`
Expected: temiz.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add icons, Input and Select primitives"
```

---

## Task 4: Checkbox + Radio + Toggle

**Files:**
- Create: `src/components/ui/checkbox/{Checkbox.tsx,Radio.tsx,checkbox.css,index.ts}`, `src/components/ui/toggle/{Toggle.tsx,toggle.css,index.ts}`
- Test: `src/components/ui/checkbox/Checkbox.test.tsx`, `src/components/ui/toggle/Toggle.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens
- Produces:
  - `Checkbox` — props `{ label?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>` (type=checkbox), `forwardRef<HTMLInputElement>`
  - `Radio` — aynı imza, type=radio
  - `Toggle` — props `{ label?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>` (type=checkbox, `role="switch"`), `forwardRef<HTMLInputElement>`

- [ ] **Step 1: Checkbox/Radio başarısız testini yaz**

`src/components/ui/checkbox/Checkbox.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "./Checkbox";
import { Radio } from "./Radio";

describe("Checkbox", () => {
  it("label ile iliskili bir checkbox render eder", () => {
    render(<Checkbox label="Kabul" />);
    expect(screen.getByRole("checkbox", { name: "Kabul" })).toBeInTheDocument();
  });
  it("tiklaninca onChange tetiklenir", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Kabul" onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Kabul" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("disabled iken devre disidir", () => {
    render(<Checkbox label="Kabul" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

describe("Radio", () => {
  it("label ile iliskili bir radio render eder", () => {
    render(<Radio name="g" label="Secenek A" />);
    expect(screen.getByRole("radio", { name: "Secenek A" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/checkbox/Checkbox.test.tsx`
Expected: FAIL — `./Checkbox` yok.

- [ ] **Step 3: Checkbox ve Radio'yu yaz**

`src/components/ui/checkbox/Checkbox.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => {
    const input = (
      <input ref={ref} type="checkbox" className={cx("checkbox", className)} {...rest} />
    );
    if (!label) return input;
    return (
      <label className="checkbox-label">
        {input}
        <span>{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
```

`src/components/ui/checkbox/Radio.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...rest }, ref) => {
    const input = (
      <input ref={ref} type="radio" className={cx("radio", className)} {...rest} />
    );
    if (!label) return input;
    return (
      <label className="checkbox-label">
        {input}
        <span>{label}</span>
      </label>
    );
  },
);

Radio.displayName = "Radio";
```

`src/components/ui/checkbox/checkbox.css`:

```css
.checkbox-label {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: var(--font-sans); font-size: var(--text-body); color: var(--color-text);
  cursor: pointer;
}
.checkbox, .radio {
  width: 16px; height: 16px; accent-color: var(--color-primary); cursor: pointer;
}
.checkbox:focus-visible, .radio:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.checkbox:disabled, .radio:disabled { cursor: not-allowed; opacity: 0.5; }
```

`src/components/ui/checkbox/index.ts`:

```typescript
export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";
export { Radio } from "./Radio";
export type { RadioProps } from "./Radio";
```

- [ ] **Step 4: Toggle başarısız testini yaz**

`src/components/ui/toggle/Toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("bir switch render eder", () => {
    render(<Toggle label="Bildirimler" />);
    expect(screen.getByRole("switch", { name: "Bildirimler" })).toBeInTheDocument();
  });
  it("tiklaninca onChange tetiklenir", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Bildirimler" onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("disabled iken devre disidir", () => {
    render(<Toggle label="Bildirimler" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
```

- [ ] **Step 5: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/toggle/Toggle.test.tsx`
Expected: FAIL — `./Toggle` yok.

- [ ] **Step 6: Toggle'ı yaz**

`src/components/ui/toggle/Toggle.tsx`:

```tsx
import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./toggle.css";

export interface ToggleProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, ...rest }, ref) => (
    <label className="toggle-label">
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className={cx("toggle", className)}
        {...rest}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  ),
);

Toggle.displayName = "Toggle";
```

`src/components/ui/toggle/toggle.css`:

```css
.toggle-label {
  display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: var(--font-sans); font-size: var(--text-body); color: var(--color-text);
  cursor: pointer;
}
/* Native input gorsel olarak gizlenir ama erisilebilir kalir */
.toggle {
  position: absolute; width: 1px; height: 1px; opacity: 0; margin: 0;
}
.toggle-track {
  position: relative; width: 36px; height: 20px;
  background: var(--color-border-strong); border-radius: 999px;
  transition: background-color 0.15s ease;
}
.toggle-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: #fff; border-radius: 50%;
  transition: transform 0.15s ease;
}
.toggle:checked + .toggle-track { background: var(--color-primary); }
.toggle:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }
.toggle:focus-visible + .toggle-track { box-shadow: var(--focus-ring); }
.toggle:disabled + .toggle-track { opacity: 0.5; cursor: not-allowed; }
```

`src/components/ui/toggle/index.ts`:

```typescript
export { Toggle } from "./Toggle";
export type { ToggleProps } from "./Toggle";
```

- [ ] **Step 7: Tüm testlerin geçtiğini doğrula**

Run: `pnpm test src/components/ui/checkbox src/components/ui/toggle`
Expected: PASS.

Run: `pnpm typecheck`
Expected: temiz.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Checkbox, Radio and Toggle primitives"
```

---

## Task 5: Badge + Alert + Card + barrel

**Files:**
- Create: `src/components/ui/badge/{Badge.tsx,badge.css,index.ts}`, `src/components/ui/alert/{Alert.tsx,alert.css,index.ts}`, `src/components/ui/card/{Card.tsx,card.css,index.ts}`, `src/components/ui/index.ts`
- Test: `src/components/ui/badge/Badge.test.tsx`, `src/components/ui/alert/Alert.test.tsx`, `src/components/ui/card/Card.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens, `AlertIcon` (Task 3)
- Produces:
  - `Badge` — props `{ variant?: "neutral" | "primary" | "success" | "warning" | "danger"; shape?: "pill" | "count" } & React.HTMLAttributes<HTMLSpanElement>`
  - `Alert` — props `{ type?: "info" | "success" | "warning" | "danger"; title?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>`; `role="alert"`; sol-kenar 4px
  - `Card` — props `{ title?: React.ReactNode; actions?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>`
  - Barrel `src/components/ui/index.ts` — tüm primitive'ler + tipleri

- [ ] **Step 1: Badge başarısız testini yaz**

`src/components/ui/badge/Badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("icerigi render eder", () => {
    render(<Badge>Aktif</Badge>);
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });
  it("variant sinifini uygular", () => {
    render(<Badge variant="success">Onayli</Badge>);
    expect(screen.getByText("Onayli").className).toContain("badge--success");
  });
  it("count sekli count sinifini uygular", () => {
    render(<Badge shape="count">3</Badge>);
    expect(screen.getByText("3").className).toContain("badge--count");
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/badge/Badge.test.tsx`
Expected: FAIL — `./Badge` yok.

- [ ] **Step 3: Badge'i yaz**

`src/components/ui/badge/Badge.tsx`:

```tsx
import { cx } from "@/lib/cx";
import "./badge.css";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger";
export type BadgeShape = "pill" | "count";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
}

export function Badge({
  variant = "neutral",
  shape = "pill",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx("badge", `badge--${variant}`, `badge--${shape}`, className)}
      {...rest}
    />
  );
}
```

`src/components/ui/badge/badge.css`:

```css
.badge {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1);
  font-family: var(--font-sans); font-size: var(--text-small); font-weight: var(--weight-medium);
  padding: 2px var(--space-2); border-radius: 999px; line-height: 1.4;
}
.badge--count { min-width: 18px; height: 18px; padding: 0 var(--space-1); font-family: var(--font-mono); }
.badge--neutral { background: var(--color-neutral-soft); color: var(--color-text-muted); }
.badge--primary { background: var(--color-primary-soft); color: var(--color-primary); }
.badge--success { background: var(--color-success-soft); color: var(--color-success); }
.badge--warning { background: var(--color-warning-soft); color: var(--color-warning); }
.badge--danger { background: var(--color-danger-soft); color: var(--color-danger); }
```

`src/components/ui/badge/index.ts`:

```typescript
export { Badge } from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeShape } from "./Badge";
```

- [ ] **Step 4: Alert başarısız testini yaz**

`src/components/ui/alert/Alert.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("alert rolunde icerigi render eder", () => {
    render(<Alert>Bir sorun olustu</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Bir sorun olustu");
  });
  it("type sinifini uygular", () => {
    render(<Alert type="danger">Hata</Alert>);
    expect(screen.getByRole("alert").className).toContain("alert--danger");
  });
  it("baslik verilince basligi render eder", () => {
    render(<Alert title="Uyari">Detay</Alert>);
    expect(screen.getByText("Uyari")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/alert/Alert.test.tsx`
Expected: FAIL — `./Alert` yok.

- [ ] **Step 6: Alert'i yaz**

`src/components/ui/alert/Alert.tsx`:

```tsx
import { cx } from "@/lib/cx";
import { AlertIcon } from "@/components/ui/icons";
import "./alert.css";

export type AlertType = "info" | "success" | "warning" | "danger";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: React.ReactNode;
}

export function Alert({ type = "info", title, className, children, ...rest }: AlertProps) {
  return (
    <div role="alert" className={cx("alert", `alert--${type}`, className)} {...rest}>
      <span className="alert-icon">
        <AlertIcon />
      </span>
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-content">{children}</div>
      </div>
    </div>
  );
}
```

`src/components/ui/alert/alert.css`:

```css
.alert {
  display: flex; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-8);
  border-left: 4px solid transparent;   /* sabitlenmis 4px sol kenar */
  font-family: var(--font-sans); font-size: var(--text-body);
}
.alert-icon { display: inline-flex; flex-shrink: 0; }
.alert-title { font-weight: var(--weight-semibold); margin-bottom: 2px; }
.alert--info { background: var(--color-primary-soft); border-left-color: var(--color-primary); color: var(--color-text); }
.alert--info .alert-icon { color: var(--color-primary); }
.alert--success { background: var(--color-success-soft); border-left-color: var(--color-success); color: var(--color-text); }
.alert--success .alert-icon { color: var(--color-success); }
.alert--warning { background: var(--color-warning-soft); border-left-color: var(--color-warning); color: var(--color-text); }
.alert--warning .alert-icon { color: var(--color-warning); }
.alert--danger { background: var(--color-danger-soft); border-left-color: var(--color-danger); color: var(--color-text); }
.alert--danger .alert-icon { color: var(--color-danger); }
```

`src/components/ui/alert/index.ts`:

```typescript
export { Alert } from "./Alert";
export type { AlertProps, AlertType } from "./Alert";
```

- [ ] **Step 7: Card başarısız testini yaz**

`src/components/ui/card/Card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("govdeyi render eder", () => {
    render(<Card>Icerik</Card>);
    expect(screen.getByText("Icerik")).toBeInTheDocument();
  });
  it("baslik ve aksiyonlari render eder", () => {
    render(
      <Card title="Baslik" actions={<button>Aksiyon</button>}>
        Icerik
      </Card>,
    );
    expect(screen.getByText("Baslik")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksiyon" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/components/ui/card/Card.test.tsx`
Expected: FAIL — `./Card` yok.

- [ ] **Step 9: Card'ı yaz**

`src/components/ui/card/Card.tsx`:

```tsx
import { cx } from "@/lib/cx";
import "./card.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Card({ title, actions, className, children, ...rest }: CardProps) {
  return (
    <div className={cx("card", className)} {...rest}>
      {(title || actions) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
```

`src/components/ui/card/card.css`:

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-14);
  box-shadow: var(--shadow-card);
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider);
}
.card-title { font-size: var(--text-section); font-weight: var(--weight-semibold); color: var(--color-text); }
.card-body { padding: var(--space-6); font-family: var(--font-sans); font-size: var(--text-body); color: var(--color-text); }
```

`src/components/ui/card/index.ts`:

```typescript
export { Card } from "./Card";
export type { CardProps } from "./Card";
```

- [ ] **Step 10: Barrel dosyasını yaz**

`src/components/ui/index.ts`:

```typescript
export * from "./button";
export * from "./input";
export * from "./select";
export * from "./checkbox";
export * from "./toggle";
export * from "./badge";
export * from "./alert";
export * from "./card";
```

- [ ] **Step 11: Tüm testlerin geçtiğini doğrula**

Run: `pnpm test src/components/ui`
Expected: PASS (tüm primitive testleri).

Run: `pnpm typecheck`
Expected: temiz.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add Badge, Alert, Card primitives and ui barrel"
```

---

## Task 6: Showcase sayfası + Playwright görsel regresyon + CI

**Files:**
- Create: `src/app/design-system/page.tsx`, `playwright.config.ts`, `e2e/visual.spec.ts`
- Modify: `package.json` (test:visual scripti + `@playwright/test`), `.github/workflows/ci.yml` (görsel job)

**Interfaces:**
- Consumes: tüm primitive'ler (barrel `@/components/ui`), `EyeIcon`
- Produces: `/design-system` rotası; `pnpm test:visual` scripti; CI görsel job

- [ ] **Step 1: Showcase sayfasını yaz**

`src/app/design-system/page.tsx` (`"use client"`; ≤400 satır):

```tsx
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
        Tasarim Sistemi — Primitive'ler
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
```

- [ ] **Step 2: Sayfanın derlendiğini doğrula**

Run: `pnpm build`
Expected: `✓ Compiled successfully` — `/design-system` rotası listelenir.

- [ ] **Step 3: Playwright'ı kur ve yapılandır**

Run: `pnpm add -D @playwright/test@^1.49`
Run: `pnpm exec playwright install chromium`

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

`package.json` scripts'e ekle:

```json
    "test:visual": "playwright test",
    "test:visual:update": "playwright test --update-snapshots"
```

- [ ] **Step 4: Görsel snapshot testini yaz**

`e2e/visual.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system");
  // Fontlarin yuklenmesini bekle (deterministik snapshot icin)
  await page.evaluate(() => document.fonts.ready);
});

const sections = [
  "section-buttons",
  "section-inputs",
  "section-controls",
  "section-badges",
  "section-alerts",
  "section-cards",
];

for (const id of sections) {
  test(`gorsel: ${id}`, async ({ page }) => {
    const el = page.getByTestId(id);
    await expect(el).toHaveScreenshot(`${id}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
```

- [ ] **Step 5: Baseline stratejisi — controller ile netleştir**

> **ÖNEMLİ:** Görsel baseline'lar CI'ın çalışacağı ortamla (Linux) aynı ortamda üretilmelidir; yerel macOS snapshot'ları CI'da font-render farkıyla patlar. Uygulayıcı, aşağıdaki iki yöntemden hangisinin kullanılacağını **controller'a sorar** (bu, review kapısına takılmamak için önceden çözülmeli):
> - **(a) Docker ile yerel Linux baseline (önerilen):**
>   `docker run --rm -v "$(pwd)":/w -w /w mcr.microsoft.com/playwright:v1.49.0-jammy /bin/bash -c "corepack enable && pnpm install --frozen-lockfile && pnpm test:visual:update"`
>   Bu, `e2e/visual.spec.ts-snapshots/*-chromium-linux.png` baseline'larını üretir; commit edilir.
> - **(b) CI-üret-commit:** Baseline'sız ilk CI koşumu snapshot üretemez (salt-okunur); bunun yerine bir kez elle `visual` job'ı `--update-snapshots` ile çalıştırılıp artefaktlar indirilip commit edilir.
>
> Lokal duman testi (macOS, baseline COMMIT EDİLMEZ):
> Run: `pnpm test:visual:update` → 6 test PASS olduğunu doğrula.
> Sonra macOS snapshot'larını sil: `rm -rf e2e/visual.spec.ts-snapshots` (yalnız Linux baseline commit edilecek).

- [ ] **Step 6: Linux baseline'ları üret ve doğrula**

Controller ile netleşen yönteme göre (5a önerilir) Linux baseline'ları üret.
Run: `ls e2e/visual.spec.ts-snapshots/`
Expected: 6 adet `*-chromium-linux.png`.
Run: `pnpm test:visual`
Expected: 6 test PASS (Linux baseline'lara karşı — Docker içinde veya CI'da).

- [ ] **Step 7: CI'a görsel job ekle**

`.github/workflows/ci.yml` — mevcut `build` job'undan sonra yeni job ekle (mevcut job korunur):

```yaml
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 8: Tüm kapıların yeşil olduğunu doğrula**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: dördü de temiz.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add design-system showcase and Playwright visual regression"
```

---

## Faz sonu kabul kriterleri

Hepsi doğru olmadan F1 kapanmaz:

- [ ] 8 primitive ailesi kanon varyant/durum setini karşılar; uygun yerlerde `forwardRef`/native passthrough.
- [ ] Bileşen CSS'lerinde **çıplak hex yok** (yalnız dokümante hover-türevi + `#fff` istisnaları). Tara: `grep -rEn "#[0-9a-fA-F]{6}" src/components/ui` yalnız beklenen değerleri gösterir.
- [ ] `tokens.css` §6.1 tam setini içerir; JetBrains Mono 700 yüklü; `prefers-color-scheme: dark` yok.
- [ ] `/design-system` tüm primitive'leri render eder; `pnpm build` temiz.
- [ ] Her primitive için Vitest+RTL davranış testi geçer; `pnpm test` tüm testler yeşil.
- [ ] `pnpm test:visual` @1280px yeşil; Linux baseline'ları commit'li.
- [ ] CI: mevcut `build` job + yeni `visual` job yeşil.
- [ ] Yalnız `pnpm-lock.yaml`; yeni bağımlılıklar yalnız `@playwright/test` + `@testing-library/user-event`.
- [ ] Secret yok; commit başlıkları İngilizce.
- [ ] F2 (auth formları) ve F3 (kabuk) bu primitive'lerin üstüne oturabilir.
