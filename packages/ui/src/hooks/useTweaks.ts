/**
 * useTweaks — runtime theme / density / accent toggles.
 *
 * Per [[0004 - styling-vanilla-css-modules-and-radix]]: the design's
 * runtime-theming pattern uses `[data-theme]`, `[data-density]`,
 * `[data-accent]` attribute selectors on `<html>`. This hook is the only
 * thing that writes those attributes; it also persists state to
 * localStorage so the user's choice survives reload.
 *
 * Tokens.css contains the variables for each combination — adding a new
 * theme/density/accent value means adding entries there too.
 */

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type Density = 'compact' | 'regular' | 'comfy';
export type Accent = 'sage' | 'amber' | 'ink' | 'cobalt' | 'rust';

export interface Tweaks {
  theme: Theme;
  density: Density;
  accent: Accent;
}

export const TWEAK_DEFAULTS: Tweaks = {
  theme: 'light',
  density: 'regular',
  accent: 'sage',
};

const STORAGE_KEY = 'k_os_tweaks';

function readStorage(): Tweaks {
  if (typeof window === 'undefined') return TWEAK_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TWEAK_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Tweaks>;
    return {
      theme: parsed.theme ?? TWEAK_DEFAULTS.theme,
      density: parsed.density ?? TWEAK_DEFAULTS.density,
      accent: parsed.accent ?? TWEAK_DEFAULTS.accent,
    };
  } catch {
    return TWEAK_DEFAULTS;
  }
}

function applyToHtml(t: Tweaks): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = t.theme;
  root.dataset.density = t.density;
  root.dataset.accent = t.accent;
}

export function useTweaks(): readonly [
  Tweaks,
  <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void,
] {
  const [tweaks, setState] = useState<Tweaks>(() => {
    const initial = readStorage();
    applyToHtml(initial);
    return initial;
  });

  // Re-apply attributes whenever any tweak changes. Persistence is in the
  // setter (one localStorage write per change rather than per render).
  useEffect(() => {
    applyToHtml(tweaks);
  }, [tweaks]);

  const setTweak = useCallback(
    <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
      setState((prev) => {
        const next = { ...prev, [key]: value };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // localStorage unavailable (private mode, quota) — keep state
          // in memory; we don't degrade the UI for that.
        }
        return next;
      });
    },
    [],
  );

  return [tweaks, setTweak] as const;
}
