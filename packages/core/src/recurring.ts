/**
 * Recurring rule for tasks.
 *
 * Stored as JSONB in `tasks.recurring_rule` on the *template* task. Instances
 * reference the template via `parent_recurring_id`. The template itself is
 * excluded from user-facing views (the `active_tasks` view filters
 * `recurring_rule IS NULL`).
 *
 * Covers the 95% of personal-use recurring patterns:
 *   - daily with interval ('every N days')
 *   - weekly with interval and specific weekdays ('Mon/Wed/Fri', 'every other Tue')
 *   - monthly on a specific day-of-month ('the 1st of every month')
 *   - monthly on a specific weekday-of-month ('first Monday', 'last Friday of each quarter')
 *
 * Skips full RFC 5545 RRULE (BYSETPOS, BYWEEKNO, EXDATE, COUNT-limited,
 * BYHOUR, etc.). If a future use-case needs that complexity, see
 * docs/schema.md → "Special types" for the extension path.
 */

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type WeekOfMonth = 1 | 2 | 3 | 4 | -1; // -1 = last

export type RecurringRule =
  | { kind: 'daily'; interval: number }
  | { kind: 'weekly'; interval: number; weekdays: Weekday[] }
  | { kind: 'monthly_day'; interval: number; dayOfMonth: number }
  | {
      kind: 'monthly_weekday';
      interval: number;
      week: WeekOfMonth;
      weekday: Weekday;
    };

export type RecurringKind = RecurringRule['kind'];

const WEEKDAY_INDEX: Record<Weekday, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

/**
 * Compute occurrences of a `RecurringRule` in `[from, until]`. Returned
 * times are normalised to the start of the day (local-time midnight) — the
 * scheduler is for daily granularity, not specific clock times. The caller
 * adds the time-of-day from the template task's `dueAt` if it wants one.
 *
 * Out of scope (returns []): rules with a non-positive `interval`, or
 * monthly rules whose anchor doesn't exist in the target month
 * (e.g. day 31 in February — those months are simply skipped).
 */
export function nextOccurrences(
  rule: RecurringRule,
  from: Date,
  until: Date,
): Date[] {
  if (rule.interval <= 0) return [];
  const out: Date[] = [];
  const start = startOfDay(from);
  const end = startOfDay(until);

  switch (rule.kind) {
    case 'daily': {
      let d = start;
      while (d.getTime() <= end.getTime()) {
        out.push(d);
        d = addDays(d, rule.interval);
      }
      break;
    }
    case 'weekly': {
      const wanted = new Set(rule.weekdays.map((w) => WEEKDAY_INDEX[w]));
      // Anchor: walk day-by-day from `start`. interval applies to the WEEK; we
      // count weeks since the start week and skip weeks not on the cadence.
      const startWeek = startOfWeek(start);
      let d = start;
      while (d.getTime() <= end.getTime()) {
        const weeksSinceStart = Math.floor(
          (startOfWeek(d).getTime() - startWeek.getTime()) / (7 * 86_400_000),
        );
        if (weeksSinceStart % rule.interval === 0 && wanted.has(d.getDay())) {
          out.push(d);
        }
        d = addDays(d, 1);
      }
      break;
    }
    case 'monthly_day': {
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      let m = startMonth;
      while (m.getTime() <= end.getTime()) {
        const day = rule.dayOfMonth;
        const candidate = new Date(m.getFullYear(), m.getMonth(), day);
        if (candidate.getMonth() === m.getMonth()) {
          if (candidate.getTime() >= start.getTime() && candidate.getTime() <= end.getTime()) {
            out.push(candidate);
          }
        }
        m = addMonths(m, rule.interval);
      }
      break;
    }
    case 'monthly_weekday': {
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const wd = WEEKDAY_INDEX[rule.weekday];
      let m = startMonth;
      while (m.getTime() <= end.getTime()) {
        const candidate = nthWeekdayOfMonth(m, wd, rule.week);
        if (
          candidate &&
          candidate.getTime() >= start.getTime() &&
          candidate.getTime() <= end.getTime()
        ) {
          out.push(candidate);
        }
        m = addMonths(m, rule.interval);
      }
      break;
    }
  }
  return out;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function addMonths(d: Date, n: number): Date {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}
function startOfWeek(d: Date): Date {
  // Week starts Monday — matches the schema's WEEKDAYS ordering.
  const c = startOfDay(d);
  const dow = c.getDay(); // Sun=0, Mon=1, ..., Sat=6
  const offset = dow === 0 ? -6 : 1 - dow;
  c.setDate(c.getDate() + offset);
  return c;
}
function nthWeekdayOfMonth(month: Date, weekday: number, n: WeekOfMonth): Date | null {
  if (n === -1) {
    // Last weekday: walk backward from the last day of the month.
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let d = last;
    while (d.getDay() !== weekday) d = addDays(d, -1);
    return d;
  }
  // 1st .. 4th weekday: walk forward from day 1.
  let d = new Date(month.getFullYear(), month.getMonth(), 1);
  let count = 0;
  while (d.getMonth() === month.getMonth()) {
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
    d = addDays(d, 1);
  }
  return null;
}
