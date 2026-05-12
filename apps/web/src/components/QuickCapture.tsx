/**
 * Quick Capture modal.
 *
 * Triggered by ⌘K globally. Two-stage slash menu:
 *
 *   stage 1 (kind):   type `/` → kinds + matching values/records inline
 *                     (typing `/today` shows Due:Today and Scheduled:Today
 *                      side by side; typing `/cri` shows Priority:Critical;
 *                      typing `/ar` shows the Area kind plus areas whose
 *                      name matches.)
 *   stage 2 (value):  selecting a kind drops you into its value list, also
 *                     reachable directly by typing `/<kind>:<query>`.
 *
 * Selecting a value adds a chip above the input and removes the `/...` token
 * from the title. Picking a second value for the same kind replaces the
 * earlier one (one chip per kind). On save, chip attachments are sent to
 * `/inbox/capture`; if the user attached a non-`inbox` status the task
 * lands directly outside the inbox.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCapture, type CaptureInput } from '../api/inbox';
import { useAreas, type AreaDto } from '../api/areas';
import { useProjects, type ProjectDto } from '../api/projects';
import { usePeople, type PersonDto } from '../api/people';
import { useContexts, type ContextDto } from '../api/catalog';
import styles from './QuickCapture.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Kinds + value tables

type KindId =
  | 'status'
  | 'priority'
  | 'due'
  | 'scheduled'
  | 'person'
  | 'project'
  | 'area'
  | 'context';

interface KindMeta {
  id: KindId;
  label: string;
  hint: string;
  /** Single-char prefix shown in the chip and as the menu glyph */
  prefix: string;
  /** Dot color for chip / bullet */
  dot: string;
}

const KINDS: KindMeta[] = [
  { id: 'status',   label: 'Status',   hint: 'next, scheduled, waiting…',     prefix: '◇', dot: '#8a5a4a' },
  { id: 'priority', label: 'Priority', hint: 'critical, important, routine…', prefix: '!', dot: '#b8714a' },
  { id: 'due',      label: 'Due',      hint: 'today, fri, 23 may',            prefix: '⏱', dot: '#a8843a' },
  { id: 'scheduled',label: 'Scheduled',hint: 'today, mon, next week',         prefix: '⌛', dot: '#a8843a' },
  { id: 'person',   label: 'Person',   hint: 'who is this for',               prefix: '@', dot: '#b8714a' },
  { id: 'project',  label: 'Project',  hint: 'attach to a project',           prefix: '▸', dot: '#4a6b8a' },
  { id: 'area',     label: 'Area',     hint: 'attach to an area',             prefix: '#', dot: '#5a7a4a' },
  { id: 'context',  label: 'Context',  hint: 'work, personal…',               prefix: '·', dot: '#5a7a4a' },
];

const KIND_BY_ID: Record<KindId, KindMeta> = Object.fromEntries(
  KINDS.map((k) => [k.id, k]),
) as Record<KindId, KindMeta>;

interface StaticOpt {
  id: string;
  label: string;
  hint?: string;
}

const STATUS_OPTS: StaticOpt[] = [
  { id: 'next',      label: 'Next',      hint: 'Actionable now' },
  { id: 'scheduled', label: 'Scheduled', hint: 'Has a scheduled date' },
  { id: 'waiting',   label: 'Waiting',   hint: 'On someone else' },
  { id: 'delegated', label: 'Delegated', hint: 'Handed off' },
  { id: 'blocked',   label: 'Blocked',   hint: 'Can’t progress' },
  { id: 'someday',   label: 'Someday',   hint: 'No date, maybe later' },
  { id: 'done',      label: 'Done',      hint: 'Already complete' },
];

const PRIORITY_OPTS: StaticOpt[] = [
  { id: 'critical',  label: 'Critical',  hint: 'Drop other work' },
  { id: 'important', label: 'Important', hint: 'High value' },
  { id: 'routine',   label: 'Routine',   hint: 'Default' },
  { id: 'low',       label: 'Low',       hint: 'Nice to have' },
];

interface TimelineOpt {
  id: string;
  label: string;
  /** Returns an ISO date string at local noon, or null for "no date" */
  resolve: () => string | null;
  hint: () => string;
}

function isoAtNoon(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function nextWeekday(today: Date, weekday: number): Date {
  const diff = (weekday - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff);
}

function firstOfNextMonth(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() + 1, 1);
}

function fmtHint(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

const TIMELINE_OPTS: TimelineOpt[] = [
  { id: 'today',     label: 'Today',      resolve: () => isoAtNoon(new Date()),                   hint: () => fmtHint(new Date()) },
  { id: 'tomorrow',  label: 'Tomorrow',   resolve: () => isoAtNoon(addDays(new Date(), 1)),       hint: () => fmtHint(addDays(new Date(), 1)) },
  { id: 'thisweek',  label: 'This week',  resolve: () => isoAtNoon(nextWeekday(new Date(), 0)),   hint: () => `by ${fmtHint(nextWeekday(new Date(), 0))}` },
  { id: 'nextweek',  label: 'Next week',  resolve: () => isoAtNoon(nextWeekday(new Date(), 1)),   hint: () => fmtHint(nextWeekday(new Date(), 1)) },
  { id: 'twoweeks',  label: 'In 2 weeks', resolve: () => isoAtNoon(addDays(new Date(), 14)),      hint: () => fmtHint(addDays(new Date(), 14)) },
  { id: 'nextmonth', label: 'Next month', resolve: () => isoAtNoon(firstOfNextMonth(new Date())), hint: () => firstOfNextMonth(new Date()).toLocaleDateString(undefined, { month: 'short' }) },
];

// ────────────────────────────────────────────────────────────────────────────
// Chip model

interface Chip {
  kind: KindId;
  /** Record id for person/project/area/context, otherwise the enum/preset id. */
  id: string;
  label: string;
  hint?: string | undefined;
  /** Avatar background for person chips. */
  color?: string | undefined;
  initials?: string | undefined;
  /** Resolved ISO for due/scheduled chips so we don't re-evaluate at save. */
  iso?: string | null | undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// Menu options (unified row shape so the keyboard handler is simple)

type RowVariant = 'kind' | 'value';

interface Row {
  variant: RowVariant;
  kind: KindId;
  /** For value rows, the value id (record id or preset id). */
  id: string;
  label: string;
  sub?: string | undefined;
  /** Person avatar bits */
  color?: string | undefined;
  initials?: string | undefined;
  /** Pre-resolved ISO for timeline rows */
  iso?: string | null | undefined;
}

// ────────────────────────────────────────────────────────────────────────────

export interface QuickCaptureProps {
  open: boolean;
  onClose: () => void;
}

export function QuickCapture({ open, onClose }: QuickCaptureProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chips, setChips] = useState<Chip[]>([]);
  const [menu, setMenu] = useState<
    | { stage: 'kind'; query: string; slashAt: number }
    | { stage: 'value'; kind: KindId; query: string; slashAt: number }
    | null
  >(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const capture = useCapture();

  // Pull record sources for slash search. These are cached via React Query so
  // re-opening the modal is instant after the first render.
  const peopleQ = usePeople();
  const projectsQ = useProjects();
  const areasQ = useAreas();
  const contextsQ = useContexts();
  const people = peopleQ.data?.people ?? [];
  const projects = projectsQ.data?.projects ?? [];
  const areas = areasQ.data?.areas ?? [];
  const contexts = contextsQ.data?.contexts ?? [];

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setChips([]);
      setMenu(null);
      setActiveIdx(0);
      capture.reset();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rows: Row[] = useMemo(() => {
    if (!menu) return [];
    const q = menu.query.trim().toLowerCase();

    if (menu.stage === 'value') {
      return buildValueRows(menu.kind, q, { people, projects, areas, contexts });
    }

    // stage === 'kind': kinds matching query + cross-record values matching query.
    const out: Row[] = [];
    for (const k of KINDS) {
      if (!q || k.label.toLowerCase().includes(q) || k.id.startsWith(q)) {
        out.push({ variant: 'kind', kind: k.id, id: k.id, label: k.label, sub: k.hint });
      }
    }
    if (q) {
      // Status / priority value matches → become direct-pick rows.
      for (const o of STATUS_OPTS) {
        if (o.label.toLowerCase().startsWith(q) || o.id.startsWith(q)) {
          out.push({ variant: 'value', kind: 'status', id: o.id, label: o.label, sub: o.hint });
        }
      }
      for (const o of PRIORITY_OPTS) {
        if (o.label.toLowerCase().startsWith(q) || o.id.startsWith(q)) {
          out.push({ variant: 'value', kind: 'priority', id: o.id, label: o.label, sub: o.hint });
        }
      }
      // Timeline value matches expand into BOTH /due and /scheduled.
      for (const t of TIMELINE_OPTS) {
        if (t.label.toLowerCase().startsWith(q) || t.id.startsWith(q)) {
          out.push({ variant: 'value', kind: 'due',       id: t.id, label: t.label, sub: t.hint(), iso: t.resolve() });
          out.push({ variant: 'value', kind: 'scheduled', id: t.id, label: t.label, sub: t.hint(), iso: t.resolve() });
        }
      }
      // Record matches.
      for (const p of people) {
        if (p.name.toLowerCase().includes(q)) {
          out.push({
            variant: 'value', kind: 'person', id: p.id, label: p.name,
            sub: p.role ?? undefined, color: p.color, initials: p.initials,
          });
        }
      }
      for (const p of projects) {
        if (p.name.toLowerCase().includes(q)) {
          out.push({ variant: 'value', kind: 'project', id: p.id, label: p.name, sub: p.outcome });
        }
      }
      for (const a of areas) {
        if (a.name.toLowerCase().includes(q)) {
          out.push({ variant: 'value', kind: 'area', id: a.id, label: a.name, sub: a.standard });
        }
      }
      for (const ctx of contexts) {
        if (ctx.label.toLowerCase().includes(q) || ctx.slug.startsWith(q)) {
          out.push({ variant: 'value', kind: 'context', id: ctx.id, label: ctx.label });
        }
      }
    }
    return out;
  }, [menu, people, projects, areas, contexts]);

  useEffect(() => {
    setActiveIdx(0);
  }, [menu?.stage, menu && 'kind' in menu && menu.kind, menu?.query]);

  if (!open) return null;

  // ── Input change handler: keeps the slash token state in sync with the caret.
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setTitle(value);

    const upToCaret = value.slice(0, caret);
    const slashAt = upToCaret.lastIndexOf('/');
    if (slashAt < 0) {
      setMenu(null);
      return;
    }
    const after = upToCaret.slice(slashAt + 1);
    if (/\s/.test(after)) {
      setMenu(null);
      return;
    }
    // `/kind:query` → jump straight to stage 2 for that kind.
    const kindMatch = after.match(/^([a-z]+):(.*)$/i);
    if (kindMatch && (KIND_BY_ID as Record<string, KindMeta>)[kindMatch[1].toLowerCase()]) {
      setMenu({ stage: 'value', kind: kindMatch[1].toLowerCase() as KindId, query: kindMatch[2], slashAt });
    } else {
      setMenu({ stage: 'kind', query: after, slashAt });
    }
  };

  // ── Remove the `/<token>` from the title. Used after picking a value.
  const removeSlashToken = (extra = '') => {
    if (!menu) return;
    const before = title.slice(0, menu.slashAt);
    const rest = title.slice(menu.slashAt);
    const tokenEnd = rest.search(/\s/);
    const after = tokenEnd === -1 ? '' : rest.slice(tokenEnd);
    const newText = (before + extra + after).replace(/\s{2,}/g, ' ');
    setTitle(newText);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = (before + extra).length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  // ── Rewrite the slash token to `/<kind>:` and enter stage 2.
  const enterValueStage = (kind: KindId) => {
    if (!menu) return;
    const before = title.slice(0, menu.slashAt);
    const rest = title.slice(menu.slashAt);
    const tokenEnd = rest.search(/\s/);
    const after = tokenEnd === -1 ? '' : rest.slice(tokenEnd);
    const replacement = `/${kind}:`;
    const newText = before + replacement + after;
    setTitle(newText);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = (before + replacement).length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
    setMenu({ stage: 'value', kind, query: '', slashAt: menu.slashAt });
  };

  const addChip = (chip: Chip) => {
    setChips((cs) => [...cs.filter((c) => c.kind !== chip.kind), chip]);
  };

  const pickRow = (row: Row) => {
    if (!menu) return;
    if (row.variant === 'kind') {
      enterValueStage(row.kind);
      return;
    }
    // Build chip from the row.
    const meta = KIND_BY_ID[row.kind];
    addChip({
      kind: row.kind,
      id: row.id,
      label: row.label,
      hint: row.sub,
      color: row.color,
      initials: row.initials,
      iso: row.iso,
    });
    removeSlashToken('');
    setMenu(null);
    // suppress unused warning while still keeping `meta` available for future tweaks.
    void meta;
  };

  const removeChip = (kind: KindId) =>
    setChips((cs) => cs.filter((c) => c.kind !== kind));

  // ── Save: package chips into structured CaptureInput.
  const submit = () => {
    if (!title.trim() || capture.isPending) return;
    const payload = chipsToCaptureInput(chips, title.trim(), description.trim() || null);
    capture.mutate(payload, { onSuccess: () => onClose() });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (menu && rows.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % rows.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => (i - 1 + rows.length) % rows.length); return; }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const pick = rows[activeIdx];
        if (pick) pickRow(pick);
        return;
      }
      if (e.key === 'Escape')    { e.preventDefault(); setMenu(null); return; }
    } else {
      if (e.key === 'Escape')                  { e.preventDefault(); onClose(); return; }
      if (e.key === 'Enter' && !e.shiftKey)    { e.preventDefault(); submit(); return; }
    }
  };

  // ── Render
  const headerHint =
    menu?.stage === 'value'
      ? `${KIND_BY_ID[menu.kind].label} · pick one`
      : 'Attach…';

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Quick capture">
        <div className={styles.head}>
          <span className={styles.headLabel}>Quick capture</span>
          <span className={styles.headHint}>
            Type to add an inbox item · <span className={styles.kbd}>/</span> for fields
          </span>
        </div>

        {chips.length > 0 && (
          <div className={styles.chipRow}>
            {chips.map((c) => <ChipView key={c.kind} chip={c} onRemove={() => removeChip(c.kind)} />)}
          </div>
        )}

        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Capture anything. Type / to attach a person, area, project or timeline."
          value={title}
          onChange={handleTitleChange}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <textarea
          className={styles.descriptionInput}
          placeholder="Notes (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          }}
        />

        {menu && (
          <div className={styles.menu} role="listbox">
            <div className={styles.menuHead}>
              <span>{headerHint}</span>
              <span className={styles.menuHint}>↑↓ navigate · ⏎ select · esc cancel</span>
            </div>
            <div className={styles.menuList}>
              {rows.length === 0 && <div className={styles.menuEmpty}>No matches</div>}
              {rows.map((row, i) => (
                <RowView
                  key={row.variant + ':' + row.kind + ':' + row.id}
                  row={row}
                  active={i === activeIdx}
                  showKindGlyph={menu.stage === 'kind' && row.variant === 'value'}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); pickRow(row); }}
                />
              ))}
            </div>
          </div>
        )}

        {capture.isError && (
          <div className={styles.error}>
            Couldn’t save. {(capture.error as Error)?.message ?? 'Please try again.'}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerLeft}>
            <span><span className={styles.kbd}>/</span> attach</span>
            <span><span className={styles.kbd}>↵</span> save to inbox</span>
            <span><span className={styles.kbd}>Esc</span> cancel</span>
          </span>
          <span className={styles.footerRight}>
            <span className={styles.footerSummary}>
              {chips.length === 0
                ? 'Will land in Inbox'
                : `${chips.length} attachment${chips.length > 1 ? 's' : ''} · saving to ${landingTarget(chips)}`}
            </span>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={submit}
              disabled={!title.trim() || capture.isPending}
            >
              Save
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents

function ChipView({ chip, onRemove }: { chip: Chip; onRemove: () => void }) {
  const meta = KIND_BY_ID[chip.kind];
  return (
    <span className={styles.chip}>
      {chip.kind === 'person' && chip.initials ? (
        <span className={styles.chipAvatar} style={{ background: chip.color }}>{chip.initials}</span>
      ) : (
        <span className={styles.chipDot} style={{ background: meta.dot }} />
      )}
      <span className={styles.chipPrefix}>{meta.prefix}</span>
      <span>{chip.label}</span>
      {chip.hint && <span className={styles.chipHint}>{chip.hint}</span>}
      <button
        type="button"
        className={styles.chipX}
        onClick={onRemove}
        aria-label={`Remove ${meta.label}`}
        title="Remove"
      >
        ×
      </button>
    </span>
  );
}

function RowView({
  row,
  active,
  showKindGlyph,
  onMouseEnter,
  onMouseDown,
}: {
  row: Row;
  active: boolean;
  showKindGlyph: boolean;
  onMouseEnter: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  // Pick the grid template based on whether the row needs space for the
  // `/<kind>` glyph (only stage-1 cross-record rows do).
  let variantClass = styles.menuItemValue;
  if (row.variant === 'kind') variantClass = styles.menuItemKind;
  else if (showKindGlyph) variantClass = styles.menuItemRecord;

  const cls = [styles.menuItem, variantClass, active ? styles.menuItemActive : '']
    .filter(Boolean)
    .join(' ');

  // The ornament cell is always rendered for value rows so the grid keeps
  // three (or four, when the kind glyph is shown) consistently-aligned
  // columns. Person rows get an avatar; everything else gets a small
  // kind-coloured bullet.
  const ornament =
    row.variant === 'value'
      ? row.kind === 'person' && row.initials ? (
          <span className={styles.menuAvatar} style={{ background: row.color }}>{row.initials}</span>
        ) : (
          <span className={styles.menuBullet} style={{ background: KIND_BY_ID[row.kind].dot }} />
        )
      : null;

  return (
    <div className={cls} role="option" aria-selected={active} onMouseEnter={onMouseEnter} onMouseDown={onMouseDown}>
      {row.variant === 'kind' ? (
        <>
          <span className={styles.menuGlyph}>/{row.kind}</span>
          <span className={styles.menuLabel}>{row.label}</span>
          {row.sub && <span className={styles.menuSub}>{row.sub}</span>}
        </>
      ) : (
        <>
          {showKindGlyph && <span className={styles.menuGlyph}>/{row.kind}</span>}
          {ornament}
          <span className={styles.menuLabel}>{row.label}</span>
          {row.sub && <span className={styles.menuSub}>{row.sub}</span>}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers

function buildValueRows(
  kind: KindId,
  q: string,
  data: {
    people: PersonDto[];
    projects: ProjectDto[];
    areas: AreaDto[];
    contexts: ContextDto[];
  },
): Row[] {
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  switch (kind) {
    case 'status':
      return STATUS_OPTS.filter((o) => match(o.label) || o.id.startsWith(q))
        .map<Row>((o) => ({ variant: 'value', kind, id: o.id, label: o.label, sub: o.hint }));
    case 'priority':
      return PRIORITY_OPTS.filter((o) => match(o.label) || o.id.startsWith(q))
        .map<Row>((o) => ({ variant: 'value', kind, id: o.id, label: o.label, sub: o.hint }));
    case 'due':
    case 'scheduled':
      return TIMELINE_OPTS.filter((o) => match(o.label) || o.id.startsWith(q))
        .map<Row>((o) => ({
          variant: 'value', kind, id: o.id, label: o.label,
          sub: o.hint(), iso: o.resolve(),
        }));
    case 'person':
      return data.people
        .filter((p) => match(p.name))
        .map<Row>((p) => ({
          variant: 'value', kind, id: p.id, label: p.name,
          sub: p.role ?? undefined, color: p.color, initials: p.initials,
        }));
    case 'project':
      return data.projects
        .filter((p) => match(p.name))
        .map<Row>((p) => ({ variant: 'value', kind, id: p.id, label: p.name, sub: p.outcome }));
    case 'area':
      return data.areas
        .filter((a) => match(a.name))
        .map<Row>((a) => ({ variant: 'value', kind, id: a.id, label: a.name, sub: a.standard }));
    case 'context':
      return data.contexts
        .filter((c) => match(c.label) || c.slug.startsWith(q))
        .map<Row>((c) => ({ variant: 'value', kind, id: c.id, label: c.label }));
  }
}

function chipsToCaptureInput(
  chips: Chip[],
  title: string,
  description: string | null,
): CaptureInput {
  const out: CaptureInput = { title, description, sourceKind: 'manual' };
  for (const c of chips) {
    switch (c.kind) {
      case 'status':   out.status = c.id as NonNullable<CaptureInput['status']>; break;
      case 'priority': out.priority = c.id as NonNullable<CaptureInput['priority']>; break;
      case 'due':      out.dueAt = c.iso ?? null; break;
      case 'scheduled':out.scheduledAt = c.iso ?? null; break;
      case 'person':   out.personId = c.id; break;
      case 'project':  out.projectId = c.id; break;
      case 'area':     out.areaId = c.id; break;
      case 'context':  out.contextId = c.id; break;
    }
  }
  // If the user picked a scheduled date but didn't pick a status, infer
  // `scheduled` so the task doesn't sit in the inbox waiting for triage.
  if (!out.status && out.scheduledAt) out.status = 'scheduled';
  return out;
}

function landingTarget(chips: Chip[]): string {
  const statusChip = chips.find((c) => c.kind === 'status');
  if (statusChip) return statusChip.label;
  if (chips.some((c) => c.kind === 'scheduled')) return 'Scheduled';
  return 'Inbox';
}
