/**
 * useViewport — returns the current breakpoint label.
 *
 * Three buckets keyed on the prototype's responsive intent:
 *   - mobile  : < 640 px
 *   - tablet  : 640..1023
 *   - desktop : ≥ 1024
 *
 * Hosts switch between AppShell and MobileShell on the bucket. SSR-safe:
 * renders the desktop bucket on the server (largest fallback).
 */

import { useEffect, useState } from 'react';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX = 639;
const TABLET_MAX = 1023;

function read(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w <= MOBILE_MAX) return 'mobile';
  if (w <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

export function useViewport(): Viewport {
  const [v, setV] = useState<Viewport>(() => read());
  useEffect(() => {
    const handler = () => setV(read());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return v;
}
