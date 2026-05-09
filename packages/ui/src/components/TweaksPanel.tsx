/**
 * TweaksPanel — runtime theme / density / accent toggles.
 *
 * Per [[0004 - styling-vanilla-css-modules-and-radix]]: Radix Popover for
 * the dialog/dismiss plumbing; the panel itself is pure CSS Modules.
 *
 * Wires `useTweaks` so each toggle updates `<html>`'s `data-*` attributes
 * and persists to localStorage. The host (apps/web) places the trigger
 * in the topbar and chooses where to mount it; this component is purely
 * presentation + state.
 */

import * as Popover from '@radix-ui/react-popover';
import { Icon } from './Icon';
import { useTweaks, type Accent, type Density, type Theme } from '../hooks/useTweaks';
import styles from './TweaksPanel.module.css';

const THEMES: Theme[] = ['light', 'dark'];
const DENSITIES: Density[] = ['compact', 'regular', 'comfy'];

interface AccentSwatch {
  value: Accent;
  color: string;
}
const ACCENTS: AccentSwatch[] = [
  { value: 'sage', color: '#5a7a4a' },
  { value: 'amber', color: '#a07a3a' },
  { value: 'ink', color: '#1a1a1a' },
  { value: 'cobalt', color: '#3a5a8a' },
  { value: 'rust', color: '#a05a3a' },
];

export function TweaksPanel() {
  const [tweaks, setTweak] = useTweaks();

  return (
    <Popover.Root>
      <Popover.Trigger className={styles.trigger} aria-label="Tweaks">
        <Icon name="settings" size={13} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className={styles.content}
        >
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Theme</div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Mode</span>
              <SegmentedRadio
                value={tweaks.theme}
                options={THEMES}
                onChange={(v) => setTweak('theme', v)}
              />
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Density</span>
              <SegmentedRadio
                value={tweaks.density}
                options={DENSITIES}
                onChange={(v) => setTweak('density', v)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Accent</div>
            <div className={styles.colorRow}>
              {ACCENTS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Accent: ${value}`}
                  aria-pressed={tweaks.accent === value}
                  onClick={() => setTweak('accent', value)}
                  className={`${styles.colorSwatch} ${
                    tweaks.accent === value ? styles.colorSwatchActive : ''
                  }`}
                  style={{ ['--swatch-color' as string]: color }}
                />
              ))}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface SegmentedRadioProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

function SegmentedRadio<T extends string>({
  value,
  options,
  onChange,
}: SegmentedRadioProps<T>) {
  return (
    <div className={styles.segGroup} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={`${styles.segBtn} ${value === opt ? styles.segBtnActive : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
