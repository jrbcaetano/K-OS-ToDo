---
type: session
date: 2026-05-09
duration: ~50m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-9
  - ui
  - shell
  - sidebar
  - tweaks
  - radix
---

# Block 9 — App shell + tweaks panel

> [!success] Outcome in one line
> The 232px sidebar / topbar / scrollable-content shell is in place, the runtime tweak panel (theme · density · accent) flips `<html>` data-attrs and persists to localStorage, and `apps/web/__root.tsx` wraps every route in the new `<AppShell>`.

## Goal

Replace the placeholder root layout with the production shell so every screen ships into a consistent frame, and ship the runtime tweaks pattern from [[0004 - styling-vanilla-css-modules-and-radix]] as a real Popover.

## Outcomes

### Navigation manifest

- ✅ **`packages/core/src/navigation.ts`** — new module exporting `NAV_GROUPS` (a `NavGroup[]` of `{ group, items: { id, name, path, icon }[] }`). Two groups today: **Workspace** (Today / Inbox / Upcoming / Waiting) and **Outcomes** (Projects / Areas / People / Review). Re-exported from `@k-os/core/index.ts`. The Sidebar reads from this directly; `apps/web/__root.tsx` matches `id` to compute the active state.

### `@k-os/ui` additions

- ✅ **`hooks/useTweaks.ts`** — typed hook returning `[tweaks, setTweak]`. Reads/writes `localStorage` (`k_os_tweaks` key) and applies `data-theme` / `data-density` / `data-accent` to `<html>` on init and on every change. Defaults: `light / regular / sage`. `setTweak('density', 'compact')` updates one key without clobbering the others.
- ✅ **`components/TweaksPanel.tsx` + `.module.css`** — Radix Popover trigger (settings icon in the topbar) → 280px panel with Theme + Density segmented radios and 5 accent colour swatches. The whole thing is a thin shell over `useTweaks` — no internal state. Per ADR 0004 we use Radix for the dismiss/keyboard plumbing only; the visual is pure CSS Modules.
- ✅ **`layouts/AppShell.tsx` + `.module.css`** — the desktop two-column grid (`232px 1fr`, with a `:global([data-density='compact'])` selector dropping to `220px` to match the prototype). Topbar + scrollable content; props are `sidebar`, `title`, `meta?`, `topbarActions?`, `children`.
- ✅ **`layouts/Sidebar.tsx` + `.module.css`** — brand block, optional `topSlot` (Quick Add / Search), groups + items, optional footer with avatar + meta. Exposes a `renderItem` callback so the host wires its own router (TanStack `<Link>` in `apps/web`); the package stays framework-agnostic.
- ✅ **`packages/ui/package.json`** — added `@radix-ui/react-popover` (Radix is the sanctioned dialog/popover library per ADR 0004) and `@k-os/core` (consumed by `Sidebar` for the `NavGroup`/`NavItem` types).

### Wiring

- ✅ **`apps/web/src/routes/__root.tsx`** — replaces the placeholder. Reads `useRouterState().location.pathname`, finds the matching `NavItem.id`, and renders `<AppShell>` with `<Sidebar>` and `<TweaksPanel>` in the topbar. `renderItem` returns a TanStack `<Link>` so navigation stays SPA-fast.

### Verification

- ✅ `pnpm -r typecheck` — green across the whole workspace + `apps/web`.
- ⏳ Visual diff against the prototype + tweaks-panel state-roundtrip deferred to a manual `pnpm dev` run (browser test). Sidebar nav + active-state highlighting are deterministic; the live exercise is to confirm the popover hover/dismiss feel right.

## Decisions made

- **Single source for nav**: `NAV_GROUPS` lives in `@k-os/core` (not `@k-os/ui`) because it's a content/data shape, not styling. The UI layer reads it; the data layer owns it. Future workspaces could derive workspace-specific nav from the same shape.
- **`Sidebar` is generic over its link element**: `renderItem(item, props) => ReactNode` lets `apps/web` return a TanStack `<Link>`. If a future native shell mounts the same Sidebar, it returns whatever its routing primitive is. Keeps `@k-os/ui` from depending on `@tanstack/react-router`.
- **`TweaksPanel` is self-contained**: no props, reads/writes localStorage internally via `useTweaks`. Hosts mount it in their topbar and that's it. If two TweaksPanels ever mount at once they'd conflict on writes, but localStorage is a singleton and we never need two.
- **Radix Popover, not Dialog**: a non-modal popover is the right primitive — clicking outside dismisses, the rest of the page stays interactive, no focus trap. Dialog would over-promote a tweaks UI.
- **Five accent values** (`sage / amber / ink / cobalt / rust`): matches the prototype's `ACCENT_MAP`. The actual `--accent`/`--accent-soft`/`--accent-ink` triplet for each is in `tokens.css` (already in place).
- **`:global([data-density='compact'])` selector** in `AppShell.module.css` is the cleanest CSS Modules expression of the existing prototype rule. Targets the `<html>` data-attr toggled by `useTweaks`.
- **Active-id detection in `__root.tsx`**: matches `path === '/'` exactly for Today, otherwise prefix-matches. Avoids `/projects/abc` activating both `projects` and (a hypothetical) `proj`-prefixed item.
- **No counts wiring yet**: `Sidebar` accepts `counts` and `alerts` records keyed by id; `apps/web` doesn't pass them yet because the data hooks aren't in place. Block 10 (Today) will hook them.

## Decisions deferred

- **Quick Add CTA + Search button at the top of the sidebar**: the prototype shows them; deferred to Block 11 (Inbox + Quick Capture) since the modal lives there. The `topSlot` prop is already in the API.
- **`<RightRail>` slot**: AppShell currently has `sidebar + main`; areas/people detail screens (Block 14, 15) want a right rail. Add the prop when those screens land — adding it later is non-breaking.
- **Hover affordances on the topbar action buttons**: inline-styled for now to avoid creating a one-off `IconButton` component just for the topbar. Block 10 onwards may push us to extract one.
- **TweaksPanel "Reset to defaults"**: nice-to-have, easy to add later.

## Open questions

- **Does the Radix popover render correctly given strict CSP / portal mounting?** The Vercel build doesn't use CSP today; if/when one lands, `Popover.Portal` mounts to `body` by default which should be fine. Worth a pass during Block 18 production prep.

## Next steps

Block 10 — **Today screen**. Wires `GET /api/tasks/today` via TanStack Query, composes the prototype's section layout (Focus / Overdue / Due / Followups / Scheduled) using the primitives from Block 8, and replaces the placeholder home route. After Block 10 the Today view is the first screen with real data flowing end-to-end.

## Notes & context

- **The Sidebar's `topSlot` and `footerSlot` props are deliberate hooks** for the Quick Add CTA (Block 11) and a settings icon (whenever account settings ship). Keeps the component closed for modification, open for extension.
- **`@k-os/ui` now depends on `@k-os/core`**: a one-way dependency that mirrors the data flow (`core` carries types and content, `ui` consumes). Keeps `core` decoupled (no React imports there).
- **Cookie / state inventory** after Block 9: localStorage `k_os_tweaks` stores `{ theme, density, accent }`. No new cookies.
