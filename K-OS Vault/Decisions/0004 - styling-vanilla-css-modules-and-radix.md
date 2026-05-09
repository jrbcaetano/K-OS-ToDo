---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - frontend
  - styling
  - design-system
---

# 0004 — Styling: vanilla CSS Modules + Radix UI primitives

> [!warning] Most consequential frontend decision
> This decision goes against the contemporary default (Tailwind + shadcn/ui). The rationale is that the **existing design** dictates the styling shape, and the default doesn't fit it well. Read the *Context* carefully before contesting.

## Context

The Project North Star design (`design/project-north-start/`) was built as a high-fidelity prototype using:

- **CSS custom properties** as the source of truth for colors, typography, spacing, and density
- **`[data-theme]` and `[data-density]` attribute selectors** for runtime theme switching
- A user-edited tokens file (`styles.css`) — Joao actively rewrote tokens during the design process (e.g. `--paper: #fbfbfb`, neutralised the warm-paper palette)
- **Multi-axis runtime theming**: theme (light/dark) × accent (sage/amber/ink/cobalt/rust) × density (compact/comfy/calm) — all swap by editing CSS variables and toggling root attributes

The frontend stack must:
- Reproduce the prototype's visual output **pixel-perfectly**
- Preserve the runtime-theming pattern (it's a product feature, not just a developer tool)
- Let the user keep editing tokens in a single place (`tokens.css`)
- Not fight the design's structure

## Decision

- **CSS Modules** per component, scoped automatically by Vite
- **`tokens.css`** ported from the design's `styles.css` as the design system's source of truth, lives in `packages/ui/`
- **Radix UI** (headless) for the accessibility-hard primitives: `Dialog`, `Popover`, `DropdownMenu`, `Listbox`, `Combobox`, `Tooltip`
- Components in `packages/ui/` consume tokens via `var(--token-name)` and own their own CSS via co-located `.module.css` files
- **No Tailwind. No shadcn/ui.**

## Alternatives considered

### Tailwind + shadcn/ui (the modern default)

- **Pros**: massive ecosystem, AI-assisted code is overwhelmingly Tailwind-shaped, shadcn copies components in (you own them), shadcn theming uses CSS variables (compatible with the design pattern), JIT bundle is small, IntelliSense is great.
- **Cons**:
  - shadcn defaults *look like* shadcn — to match North Star, every component needs re-theming, which negates most of its drop-in value
  - Density tokens (`--row-h`, `--row-pad-y`) require arbitrary values like `h-[var(--row-h)] py-[var(--pad-y)]` — workable but feels grafted-on
  - First week's work would be translating existing CSS into utility-class permutations — work that adds nothing
  - Two style systems (utility classes + CSS variables) instead of one
- **Verdict**: viable but the default's appeal (drop-in components, utility velocity) is largely lost when retheming everything to match a specific design.

### Panda CSS / vanilla-extract (zero-runtime typed CSS-in-TS)

- **Pros**: typed tokens, zero runtime, atomic CSS output, modern alternative to Tailwind that's more theming-friendly.
- **Cons**: tooling indirection between tokens-as-TypeScript and the runtime CSS-variable behavior; the design is already pure CSS — wrapping it in a TS layer adds nothing for a solo project.
- **Verdict**: good for greenfield TS-heavy teams; overkill here.

### CSS-in-JS (Emotion, styled-components)

- **Pros**: dynamic styling logic alongside JSX.
- **Cons**: runtime cost; the design's data-attribute pattern (single root flips theme for all children) is awkward to replicate; hot paths re-render styles unnecessarily.
- **Verdict**: rejected.

### Plain global CSS (no Modules)

- **Pros**: simplest possible.
- **Cons**: no scoping; component CSS leaks; collisions become real as packages multiply.
- **Verdict**: rejected.

## Consequences

- **Positive**:
  - 1:1 mapping between prototype and production CSS — minimal translation work
  - User can keep editing `tokens.css` directly with no tooling layer in the way
  - Bundle is small; no utility-class explosion
  - CSS is portable to any future framework (React Native via expo-styling, server-rendered, etc.)
  - Component CSS is co-located, easy to read and modify
- **Negative**:
  - Less leverage from AI-assisted skills/tools that lean Tailwind (e.g. `frontend-design` skill output will need translation)
  - New contributors must read project CSS rather than recognising utility classes — small ramp-up cost
  - More verbose than `flex justify-between gap-2` for one-offs
- **Neutral**:
  - Radix gives us the dialog/popover/combobox accessibility plumbing without dictating visual style
  - Pickers and other interactive components get headless logic from Radix; styling and layout are ours

## References

- [[K-OS ToDo design — Project North Star|reference_north_star_design (memory)]]
- design/project-north-start/project/styles.css (in repo) — design tokens as written
- design/project-north-start/project/primitives.jsx (in repo) — components to port
- [Radix UI](https://www.radix-ui.com/primitives)
- [CSS Modules](https://github.com/css-modules/css-modules)
