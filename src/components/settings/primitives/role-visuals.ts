// Rol -> renk/gradyan eşlemesi (yalnızca token referansları; çıplak hex yok).
// Mockup ref §A.5: Patron/Şef/Muhasebe/PM/Satınalma. Ekstra roller on-palette analog.
export interface RoleVisual {
  badgeBg: string;
  badgeText: string;
  gradFrom: string;
  gradTo: string;
}

const MAP: Record<string, RoleVisual> = {
  system_admin: {
    badgeBg: "var(--color-text)",
    badgeText: "var(--color-on-brand)",
    gradFrom: "var(--color-text)",
    gradTo: "var(--color-slate-700)",
  },
  patron: {
    badgeBg: "var(--color-text)",
    badgeText: "var(--color-on-brand)",
    gradFrom: "var(--color-primary)",
    gradTo: "var(--color-avatar-blue-end)",
  },
  site_chief: {
    badgeBg: "var(--color-primary-soft)",
    badgeText: "var(--color-primary)",
    gradFrom: "var(--color-accent-teal-start)",
    gradTo: "var(--color-accent-teal-end)",
  },
  accounting: {
    badgeBg: "var(--color-accent-purple-soft)",
    badgeText: "var(--color-accent-purple)",
    gradFrom: "var(--color-accent-purple-grad-start)",
    gradTo: "var(--color-accent-purple-grad-end)",
  },
  project_manager: {
    badgeBg: "var(--color-warning-soft)",
    badgeText: "var(--color-warning-strong)",
    gradFrom: "var(--color-warning)",
    gradTo: "var(--color-avatar-amber-end)",
  },
  procurement: {
    badgeBg: "var(--color-surface-muted)",
    badgeText: "var(--color-text-muted)",
    gradFrom: "var(--color-text-subtle)",
    gradTo: "var(--color-avatar-slate-end)",
  },
  // Ekstra seed roller (mockup badge tanımı yok — on-palette analog):
  field_engineer: {
    badgeBg: "var(--color-primary-soft)",
    badgeText: "var(--color-primary)",
    gradFrom: "var(--color-accent-teal-start)",
    gradTo: "var(--color-accent-teal-end)",
  },
  hr_manager: {
    badgeBg: "var(--color-accent-purple-soft)",
    badgeText: "var(--color-accent-purple)",
    gradFrom: "var(--color-accent-purple-grad-start)",
    gradTo: "var(--color-accent-purple-grad-end)",
  },
};

const FALLBACK: RoleVisual = {
  badgeBg: "var(--color-surface-muted)",
  badgeText: "var(--color-text-muted)",
  gradFrom: "var(--color-text-subtle)",
  gradTo: "var(--color-avatar-slate-end)",
};

export function roleVisual(roleKey: string): RoleVisual {
  return MAP[roleKey] ?? FALLBACK;
}
