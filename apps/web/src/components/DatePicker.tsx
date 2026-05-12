/**
 * DatePicker — the calendar popover used by the task detail's Due /
 * Scheduled / Review fields. Mirrors the prototype's structure:
 *
 *   ┌──────────────────────────────────┐
 *   │ DUE                  ↹ PRESETS  │   ← head
 *   ├──────────────────────────────────┤
 *   │ Today    Tomorrow    This Sun   │   ← preset grid
 *   │ Next wk  In 2 wks    No date    │
 *   ├──────────────────────────────────┤
 *   │  ‹    May 2026    ›             │   ← month nav
 *   │  S  M  T  W  T  F  S            │   ← DOW
 *   │  1  2  3  4  5  6  7            │   ← day grid
 *   │  …                              │
 *   ├──────────────────────────────────┤
 *   │ Add time   or type "next tue 3pm"│   ← foot
 *   └──────────────────────────────────┘
 *
 * Values are exchanged as ISO strings (UTC midday so timezone shifts can't
 * push a "May 7" preset to "May 6" on the server). The caller decides
 * whether to wrap in a Popover; this component just renders the panel.
 */

import { useMemo, useState } from 'react';
import styles from './DatePicker.module.css';

export interface DatePickerProps {
  /** Current value as ISO string, or null for "no date". */
  value: string | null;
  /** Called with an ISO string or null. */
  onPick: (iso: string | null) => void;
  /** Header label shown uppercase, e.g. "Due", "Scheduled", "Review". */
  label?: string;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Build an ISO string at local noon on a y/m/d so DST / TZ shifts can't roll the day. */
function isoAtNoon(y: number, m: number, d: number): string {
  return new Date(y, m, d, 12, 0, 0, 0).toISOString();
}

/** Parse an ISO date back into local y/m/d. */
function fromIso(iso: string): { y: number; m: number; d: number } {
  const d = new Date(iso);
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
}

/** Day-of-week index for an arbitrary y/m/d in the user's local calendar. */
function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(y, m, d).getDay();
}

/** Next occurrence of `weekday` (0=Sun…6=Sat) strictly after `today`. */
function nextWeekday(today: Date, weekday: number): Date {
  const diff = (weekday - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next;
}

export function DatePicker({ value, onPick, label = 'Due' }: DatePickerProps) {
  const today = useMemo(() => new Date(), []);
  const todayYmd = useMemo(
    () => ({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }),
    [today],
  );

  const selected = value ? fromIso(value) : null;

  // Start the calendar on the month of the selected value, otherwise today.
  const initialView = selected ?? todayYmd;
  const [view, setView] = useState<{ y: number; m: number }>({
    y: initialView.y,
    m: initialView.m,
  });

  const monthLabel = `${MONTHS[view.m]} ${view.y}`;
  const firstDayOfMonth = dayOfWeek(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  // Build the calendar grid with leading null cells for offset.
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    todayYmd.y === view.y && todayYmd.m === view.m && d === todayYmd.d;
  const isSelected = (d: number) =>
    selected != null &&
    selected.y === view.y &&
    selected.m === view.m &&
    d === selected.d;

  const pickFromYmd = (y: number, m: number, d: number) => onPick(isoAtNoon(y, m, d));

  // Quick presets. Calculated relative to "today" so the menu stays current.
  const presets: Array<{ key: string; onSelect: () => void }> = [
    {
      key: 'Today',
      onSelect: () => pickFromYmd(todayYmd.y, todayYmd.m, todayYmd.d),
    },
    {
      key: 'Tomorrow',
      onSelect: () => {
        const t = new Date(today);
        t.setDate(t.getDate() + 1);
        pickFromYmd(t.getFullYear(), t.getMonth(), t.getDate());
      },
    },
    {
      key: 'This Sun',
      onSelect: () => {
        const t = nextWeekday(today, 0); // Sunday
        pickFromYmd(t.getFullYear(), t.getMonth(), t.getDate());
      },
    },
    {
      key: 'Next week',
      onSelect: () => {
        // Monday of next week
        const t = nextWeekday(today, 1);
        pickFromYmd(t.getFullYear(), t.getMonth(), t.getDate());
      },
    },
    {
      key: 'In 2 weeks',
      onSelect: () => {
        const t = new Date(today);
        t.setDate(t.getDate() + 14);
        pickFromYmd(t.getFullYear(), t.getMonth(), t.getDate());
      },
    },
    {
      key: 'No date',
      onSelect: () => onPick(null),
    },
  ];

  function prevMonth() {
    setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }));
  }
  function nextMonth() {
    setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }));
  }

  return (
    <div>
      <div className={styles.head}>
        <span>{label}</span>
        <span className={styles.hint}>presets</span>
      </div>

      <div className={styles.quicks}>
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            className={styles.quick}
            onClick={p.onSelect}
          >
            {p.key}
          </button>
        ))}
      </div>

      <div className={styles.cal}>
        <div className={styles.calHead}>
          <button
            type="button"
            className={styles.calNav}
            onClick={prevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className={styles.calMonth}>{monthLabel}</span>
          <button
            type="button"
            className={styles.calNav}
            onClick={nextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className={`${styles.calGrid} ${styles.calDow}`}>
          {DOW.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className={styles.calGrid}>
          {cells.map((d, i) =>
            d === null ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                className={`${styles.calDay} ${
                  isToday(d) ? styles.calDayToday : ''
                } ${isSelected(d) ? styles.calDaySelected : ''}`}
                onClick={() => pickFromYmd(view.y, view.m, d)}
              >
                {d}
              </button>
            ),
          )}
        </div>
      </div>

      <div className={styles.foot}>
        <span>Add time</span>
        <span className={styles.footHint}>or type “next tue 3pm”</span>
      </div>
    </div>
  );
}
