---
type: decision
status: accepted
date: 2026-05-09
tags:
  - decision
  - frontend
  - mobile
  - pwa
---

# 0007 — Mobile: responsive PWA, Capacitor wrap deferred

## Context

K-OS must be usable on mobile. The Project North Star design is **desktop-first and keyboard-driven** (⌘K, slash menu, N/S/W/D/Z triage shortcuts) — that UX doesn't translate to touch. So mobile needs **mobile-specific layouts**, regardless of whether they live in the same codebase.

Three options to evaluate:

| Option | What it is |
|---|---|
| **A. Single responsive PWA** | One codebase, breakpoint-driven layouts. Installable. |
| **B. PWA + Capacitor wrap** | Same web codebase wrapped as native iOS/Android shell when needed for native APIs. |
| **C. Separate native client (React Native / Expo)** | Two codebases. |

User stated: "OK with either responsive web or completely different mobile interface — whatever's best."

## Decision

**Single responsive PWA** with breakpoint-driven layout modes:

- **Desktop** (≥ 1024 px): the dense Linear-style UI as drawn in North Star
- **Mobile** (< 768 px): touch-first stack-of-cards / bottom-sheet UI for capture and triage
- **Tablet** (768–1024): TBD — likely closer to desktop

Both modes share the same design system, components, data layer, and state. Where layouts diverge meaningfully (Today, Inbox triage, Quick Capture, Task detail), components have parallel implementations gated by a `useViewport()` hook.

**Capacitor wrap deferred** until a real native need surfaces:
- iOS/Android push notifications
- Share-target (share-from-Slack-to-K-OS)
- App-store distribution
- Native widgets

When that day comes, Capacitor wraps the same web app — no duplicated UI work.

**No separate React Native client.**

## Alternatives considered

- **Two codebases (web + RN)** — Best mobile UX possible. **Rejected** because: doubles the work for a single-user product; two design systems to maintain; two AI integration points; no iOS-vs-Android idioms benefit at this scale.
- **Capacitor from day one** — Native shell early. **Rejected**: premature; PWAs cover ~90% of needs; iOS 16.4+ supports web push (with caveats); app-store distribution can wait.
- **Responsive without breakpoint-divergent layouts** — Single layout that "works" at all sizes. **Rejected**: keyboard UX (⌘K, slash menu, N/S/W/D/Z) is genuinely different from touch; cramming dense desktop UI onto a phone is bad UX.

## Consequences

- **Positive**: one codebase to maintain; same design system everywhere; PWA is installable on iOS and Android; defers native complexity until justified
- **Negative**: mobile-specific layouts are still real work — components like `TaskRow`, `Inbox`, and `QuickCapture` each need a mobile variant; the "responsive" word undersells this
- **Neutral**: iOS PWA push notifications are still rough (improving with iOS versions); when push matters, Capacitor lands

## Implementation note

Layout-mode mechanism:

```
packages/ui/
  layouts/
    DesktopShell.tsx      # 232px sidebar + main + optional right rail
    MobileShell.tsx       # bottom tab bar + full-bleed view + sheets
  hooks/
    useViewport.ts        # returns 'desktop' | 'tablet' | 'mobile'
```

Screens decide internally whether to render a single layout (most informational screens) or branch on viewport (Today, Inbox, Capture, Task detail).

## References

- [[0002 - first-app-vite-react-typescript]]
- [[0004 - styling-vanilla-css-modules-and-radix]]
- [[K-OS ToDo design — Project North Star|reference_north_star_design (memory)]]
