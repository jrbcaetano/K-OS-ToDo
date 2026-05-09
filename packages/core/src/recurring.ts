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
