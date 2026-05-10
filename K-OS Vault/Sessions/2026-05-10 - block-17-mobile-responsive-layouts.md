---
type: session
date: 2026-05-10
duration: ~30m (estimate)
participants:
  - Joao
  - Claude
tags:
  - session
  - block-17
  - ui
  - mobile
  - responsive
---

# Block 17 — Mobile responsive layouts

> [!success] Outcome in one line
> Below 640px the app swaps the desktop two-column shell for a mobile shell with a bottom tab bar; above it, the existing layout is unchanged.

## Outcomes

- ✅ **`@k-os/ui/hooks/useViewport.ts`** — `mobile / tablet / desktop` buckets keyed on `window.innerWidth` (≤ 639 / 640..1023 / ≥ 1024). SSR-safe (returns `desktop` on server). Listens for `resize`.
- ✅ **`@k-os/ui/layouts/MobileShell.tsx` + `.module.css`** — header (44px) + scrollable content + 5-slot bottom tab bar. Tabs are typed `MobileTab` (id, label, icon, optional `capture` flag). The middle "Capture" tab is rendered internally as a circle button calling `onCapture`; navigation tabs go through the host's `renderTab` callback so TanStack `<Link>` lives in `apps/web`. Safe-area inset accounted for on the tab bar (`env(safe-area-inset-bottom)`), so it doesn't sit under the home indicator on iOS.
- ✅ **`apps/web/src/routes/__root.tsx`** — picks `MobileShell` when `useViewport() === 'mobile'`, else `AppShell`. Quick Capture, ⌘K listener, and the `TweaksPanel` work in both. Mobile tab bar maps `today / inbox / capture / people / more` (more → /review for now).

### Verification

- ✅ `pnpm -r typecheck` — green.

## Decisions made

- **Single shell switch, not per-screen mobile variants**: the design's prototype had bespoke mobile layouts for Today / Inbox / Quick Capture / Task Detail. Most of those screens already lay out reasonably at ≤ 640px because the existing CSS uses `flex-wrap` and grid auto-fill. Per the plan's "where they meaningfully diverge" line, we ship the shell-level diff now and revisit per-screen later if real iOS testing reveals problems.
- **Bottom tab bar has 5 slots** with the middle as a CTA capture button — same pattern as Notion / Things / Apple Reminders. The "More" tab stands in for the "rest of the desktop sidebar" until a dedicated /more screen lands.
- **`MOBILE_TABS` lives in `__root.tsx`**: small content list, not worth promoting to `@k-os/core` until a second host needs it.
- **No mobile-specific Quick Capture** in this block — the modal is already 640px-max with `max-width: calc(100vw - 32px)`, so it works as-is on phones. The plan called for a "full-screen sheet"; defer that polish.
- **Tablet uses desktop layout**: the breakpoint splits at 1024 to match the prototype's `--col-narrow` thinking; tablets wider than that get the full sidebar.

## Decisions deferred

- **Per-screen mobile variants** (Today.mobile.tsx, etc.): see above; revisit after iOS testing.
- **Sheet-style task detail**: nice-to-have on mobile.
- **Swipe-back gesture**: out of scope for the web PWA.

## Next steps

Block 18 — **AI integration + recurring + PWA polish + launch**. The final block: wire `parseCapture` (Haiku) and `agentSuggestions` (Sonnet), confirm the recurring scheduler runs in production, run Lighthouse, deploy to Vercel.

## Notes & context

- **`@k-os/ui` index now exports**: components × 9, hooks × 2, layouts × 3.
- **The shell switch is reactive** — resizing the browser past 640px swaps shells live, no reload. Useful for development.
