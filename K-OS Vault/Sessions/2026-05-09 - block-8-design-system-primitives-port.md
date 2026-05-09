---
type: session
date: 2026-05-09
duration: ~50m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-8
  - ui
  - design-system
  - css-modules
---

# Block 8 — Design system primitives port

> [!success] Outcome in one line
> Phase 3 opens: every primitive from the prototype's `primitives.jsx` is now a `.tsx` + `.module.css` pair in `packages/ui`, consuming `tokens.css` via `var(--token-*)` (no hex/rgb literals), with typed props that decouple the components from any specific data source.

## Goal

Translate the prototype's primitives into a typed, CSS-Modules-based React library so the screens in Blocks 9-16 can compose them without re-reading the prototype each time.

## Outcomes

### New components (`packages/ui/src/components/`)

Each is a `.tsx` + `.module.css` pair:

- ✅ **`Icon.tsx`** — single-path SVG icons; `ICON_PATHS` map ported verbatim from `primitives.jsx`. Uses `currentColor` so colour comes from the parent. Adds `aria-label` / `role` plumbing.
- ✅ **`Avatar.tsx`** — circle + initials. Caller supplies `{ initials, color? }`; component sizes itself from a numeric `size` prop (default 22). Falls back to a gradient if no colour is given.
- ✅ **`StatusChip.tsx`** — coloured-dot status pill, one class per `TaskStatus`. Status colours come from `tokens.css` (`--status-*`).
- ✅ **`PriorityDot.tsx`** — slim 4×14 vertical bar, transparent for `routine`/`low`. Title attribute + `aria-label` set from a label map.
- ✅ **`CtxBadge.tsx`** — context label + dot; the colour is set as a CSS custom property (`--ctx-color`) on the element, and the `::before` swatch picks it up. Lets the data layer's per-context colour drive the rendering without precomputing classes.
- ✅ **`PersonChip.tsx`** — small avatar + first name. Composes `<Avatar size={16}>` plus the chip layout.
- ✅ **`DateChip.tsx`** — pre-formatted date label with state hint (`overdue` / `today` / `normal`). Caller does the formatting; component is presentation-only.
- ✅ **`SectionHead.tsx`** — uppercase label with optional count, alert badge, and an action slot. Used at the top of every list section in Today / Upcoming / Waiting / Project detail.
- ✅ **`TaskRow.tsx`** — the densest primitive. Composes `CtxBadge` / `PersonChip` / `DateChip` / `PriorityDot` / `StatusChip` and exposes typed `onOpen` / `onComplete` callbacks. The `TaskRowModel` is intentionally a smaller shape than the Drizzle row: list screens project + decorate (`dateLabel`, `dateState`) before rendering.

### Plumbing

- ✅ **`packages/ui/src/css-modules.d.ts`** — ambient `declare module '*.module.css'` so `tsc --noEmit` accepts the `.module.css` imports. Vite's CSS-modules pipeline handles resolution at build/dev; this only satisfies the typechecker.
- ✅ **`packages/ui/src/index.ts`** — re-exports every component and its prop / value types. Apps import from `@k-os/ui` only.

### Verification

- ✅ `pnpm -r typecheck` — green across all 6 packages + `apps/web`.
- ⏳ Visual diff against the prototype deferred to Block 9 (when an app shell exists to mount a preview route in).

## Decisions made

- **`TaskRowModel` is a UI-shaped projection, not the Drizzle row**. Reason: the row needs computed values (`dateLabel`, `dateState`, the resolved context-color, the resolved person record) that are not stored on `tasks`. Keeping the props detached lets the screens decide how to fetch / decorate / cache.
- **Coloured chips set CSS custom properties on the element**, not pre-defined per-context classes. The data layer hands us `{ label, color }` for any context (including user-created ones); pre-defining one CSS class per known slug would force every new context to ship a CSS update.
- **`<button>` instead of `<div onClick>`** for the row and the checkbox. Free keyboard activation, free focus ring, semantic correctness. The checkbox's `e.stopPropagation()` prevents the row click from firing when the user just wants to toggle completion.
- **One CSS module per component** — even when the rules are short. Keeps the relationship 1:1 with the JSX file and makes deletion safe (delete the pair, no orphaned global rules). Names inside a module use camelCase to match TS access (`styles.checkboxCritical`).
- **Status / Priority value types live in the UI package** (`TaskStatus`, `TaskPriority`), not imported from `@k-os/core`. The UI types model the *display* set; if a future status appears in core but isn't visually distinct, it can remain unbranded here without touching the API. Keeps the UI package free of a `@k-os/core` dependency.
- **`Defined` type pattern from Block 5 doesn't apply here**: components don't PATCH; they receive props. The optional-vs-undefined story is irrelevant.
- **Inter font assumed loaded by the host page**: `tokens.css` references `--font-sans` / `--font-mono`; the existing scaffold loads Inter via `<link>` in `apps/web/index.html`. Components don't ship their own font.

## Decisions deferred

- **Lighter wrappers for `<svg>` `aria` attrs** — current handling is per-icon; could extract a tiny `iconPropsFor(name)` helper. Re-evaluate when an icon needs an interactive role beyond label.
- **A `<TaskRowSkeleton>` for loading states**: nice-to-have for Block 10's Today screen; defer until the screen exists and we know the right shape.
- **Storybook / preview app**: not necessary for the current pace. Block 9 will mount a couple of components in a throwaway preview route to eyeball them.

## Next steps

Block 9 — **App shell + tweaks panel**. The 232px sidebar + main + (right rail) layout, plus the `[data-theme] / [data-density] / [data-accent]` runtime toggle stored in localStorage.

## Notes & context

- **Token-only styling is non-negotiable for these primitives.** Every colour, radius, padding, line-height comes from a `var(--*)` declared in `tokens.css`. If a future component needs a value the tokens don't expose, the right move is to add the token, not hard-code the value in the module.
- **Module CSS class names use camelCase by convention** (`styles.checkboxCritical`, `styles.projChip`). This is the most-Googled convention; saves a `style['kebab-case']` per access.
- **CSS Modules + tsc**: the ambient `*.module.css` declaration is the smallest thing that satisfies tsc. There's no per-file `.d.ts` generation — types stay loose at compile time and runtime mismatches surface as `undefined` className strings.
