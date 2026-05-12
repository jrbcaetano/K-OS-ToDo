/**
 * Inbox screen — triage one item at a time with the rest of the queue
 * visible below.
 *
 * UX (matches the prototype):
 *   - The currently-focused item is rendered as a large card with source
 *     meta, title, description, an editable "Suggested" row of chips, and
 *     two action buttons (Accept / Delete).
 *   - Every other inbox item appears under "Up next" as a compact row.
 *     Clicking a row focuses it.
 *   - ↑ / ↓ move the focus through the list. ⏎ accepts the focused item
 *     with whatever chip values the user picked. ⌫ / Delete discards it.
 *
 * Chip semantics:
 *   - Each chip reflects EITHER the agent's suggestion (when ai_parsed is
 *     populated by an external agent service — see ADR 0020) OR the task's
 *     current value. Clicking a chip opens a picker; the picked value
 *     becomes the pending triage payload. Nothing is persisted until the
 *     user presses Accept.
 *   - If the user hasn't picked a status, "Accept" defaults to 'next' (or
 *     'scheduled' when a scheduled_at date is present).
 *
 * Pickers are inline rather than imported from TaskDetail to keep their
 * draft state local to this screen — the inbox needs the "pending until
 * accepted" buffer, the detail screen patches each field immediately.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CtxBadge } from '@k-os/ui';
import { TASK_PRIORITIES, TASK_STATUSES } from '@k-os/core';
import {
  useDiscardInbox,
  useInbox,
  useTriage,
  type TriageInput,
} from '../api/inbox';
import { useContexts } from '../api/catalog';
import { useProjects } from '../api/projects';
import { usePeople } from '../api/people';
import { DatePicker } from '../components/DatePicker';
import type { TaskDto } from '../api/tasks';
import styles from './Inbox.module.css';

const STATUS_LABELS: Record<TaskDto['status'], string> = {
  inbox: 'Inbox',
  next: 'Next',
  scheduled: 'Scheduled',
  waiting: 'Waiting',
  delegated: 'Delegated',
  blocked: 'Blocked',
  someday: 'Someday',
  done: 'Done',
};

const PRIORITY_LABELS: Record<TaskDto['priority'], string> = {
  critical: 'Critical',
  important: 'Important',
  routine: 'Routine',
  low: 'Low',
};

// Status options the inbox can triage to. 'inbox' and 'done' are excluded.
const TRIAGE_STATUSES = TASK_STATUSES.filter(
  (s) => s !== 'inbox' && s !== 'done',
) as ReadonlyArray<Exclude<TaskDto['status'], 'inbox' | 'done'>>;

/** Per-item buffer of pending triage values. Lives only on the client until
 *  Accept fires the mutation. */
interface Draft {
  status: TaskDto['status'] | null;
  priority: TaskDto['priority'];
  contextId: string | null;
  projectId: string | null;
  personId: string | null;
  dueAt: string | null;
  scheduledAt: string | null;
}

function draftFromTask(t: TaskDto): Draft {
  return {
    status: t.status === 'inbox' ? null : t.status,
    priority: t.priority,
    contextId: t.contextId,
    projectId: t.projectId,
    personId: t.personId,
    dueAt: t.dueAt,
    scheduledAt: t.scheduledAt,
  };
}

export function InboxScreen() {
  const query = useInbox();
  const triage = useTriage();
  const discard = useDiscardInbox();

  const items = query.data?.tasks ?? [];

  const [idx, setIdx] = useState(0);
  const focused = items[Math.min(idx, items.length - 1)];

  // Local draft, keyed by focused task id so switching items resets it.
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (focused) setDraft(draftFromTask(focused));
    else setDraft(null);
  }, [focused?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp idx when the list shrinks past it.
  useEffect(() => {
    if (idx > 0 && idx >= items.length) {
      setIdx(Math.max(0, items.length - 1));
    }
  }, [idx, items.length]);

  function applyDraft() {
    if (!focused || !draft) return;
    // Status: prefer user-picked, else infer scheduled / waiting, else default to next.
    let status: TriageInput['status'] = 'next';
    if (draft.status && draft.status !== 'inbox' && draft.status !== 'done') {
      status = draft.status as TriageInput['status'];
    } else if (draft.scheduledAt) {
      status = 'scheduled';
    }
    const input: TriageInput = {
      status,
      contextId: draft.contextId,
      projectId: draft.projectId,
      personId: draft.personId,
      dueAt: draft.dueAt,
      scheduledAt: draft.scheduledAt,
    };
    triage.mutate({ id: focused.id, input });
  }

  function discardFocused() {
    if (!focused) return;
    discard.mutate(focused.id);
  }

  // Keyboard shortcuts — only when not typing in an input.
  useEffect(() => {
    if (!focused) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIdx((i) => Math.min(items.length - 1, i + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setIdx((i) => Math.max(0, i - 1));
          break;
        case 'Enter':
          e.preventDefault();
          applyDraft();
          break;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          discardFocused();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id, items.length, draft]);

  if (query.isLoading) return <div className={styles.empty}>Loading…</div>;
  if (query.isError) return <div className={styles.empty}>Couldn’t load inbox.</div>;

  if (items.length === 0 || !focused || !draft) {
    return (
      <>
        <div className={styles.head}>
          <h2 className={styles.title}>Inbox</h2>
        </div>
        <div className={styles.empty}>Inbox zero. Capture with ⌘K.</div>
      </>
    );
  }

  return (
    <>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Inbox</h2>
          <div className={styles.subline}>
            {items.length} item{items.length === 1 ? '' : 's'} waiting
          </div>
        </div>
        <div className={styles.hint}>
          <span>Triage one at a time</span>
          <span className="kos-kbd">↑</span>
          <span className="kos-kbd">↓</span>
          <span>navigate</span>
        </div>
      </div>

      <div className={styles.list}>
        {items.map((item, i) => (
          <Row
            key={item.id}
            task={item}
            index={i}
            total={items.length}
            isFocused={i === idx}
            draft={i === idx ? draft : null}
            onFocus={() => setIdx(i)}
            onDraftChange={setDraft}
            onAccept={applyDraft}
            onDiscard={discardFocused}
            accepting={triage.isPending}
            discarding={discard.isPending}
          />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Row — unified component for every inbox item.
//
// The "summary" line (checkbox + title + source/person/context meta) is
// always rendered. The "expansion" (description + suggestion chips +
// actions) is wrapped in a CSS-grid container whose `grid-template-rows`
// transitions from `0fr` (collapsed) to `1fr` (focused). The inner wrapper
// sets `overflow: hidden` + `min-height: 0` so any height can be animated
// without measuring it.
//
// Auto-scroll: when a row gains focus, scrollIntoView keeps it visible
// even when triggered via the keyboard at the edge of the viewport.
// ---------------------------------------------------------------------------

interface RowProps {
  task: TaskDto;
  index: number;
  total: number;
  isFocused: boolean;
  draft: Draft | null;
  onFocus: () => void;
  onDraftChange: (next: Draft) => void;
  onAccept: () => void;
  onDiscard: () => void;
  accepting: boolean;
  discarding: boolean;
}

function Row({
  task,
  index,
  total,
  isFocused,
  draft,
  onFocus,
  onDraftChange,
  onAccept,
  onDiscard,
  accepting,
  discarding,
}: RowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  // When focus moves to us, slide into view (no-op if already visible).
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  const sourceLabel = task.sourceKind
    ? task.sourceKind.replace(/_/g, ' ')
    : 'manual';

  return (
    <div
      ref={rowRef}
      className={`${styles.row} ${isFocused ? styles.rowFocused : ''}`}
    >
      <button
        type="button"
        className={styles.summary}
        onClick={onFocus}
        aria-expanded={isFocused}
      >
        <span className={styles.summaryCheck} aria-hidden />
        <div className={styles.summaryBody}>
          <div className={styles.summaryTitle}>{task.title}</div>
          <div className={styles.summaryMeta}>
            <span className={styles.summarySource}>{sourceLabel}</span>
            {task.person && (
              <>
                <span className={styles.cardSep}>·</span>
                <span>{task.person.name}</span>
              </>
            )}
            {task.context && (
              <>
                <span className={styles.cardSep}>·</span>
                <CtxBadge
                  label={task.context.label}
                  color={task.context.color}
                />
              </>
            )}
          </div>
        </div>
        {isFocused && (
          <span className={styles.summaryCounter}>
            {index + 1} / {total}
          </span>
        )}
      </button>

      {/*
        The expansion track. Height-animates via grid-template-rows: 0fr -> 1fr.
        Children get min-height: 0 + overflow: hidden so their natural height
        can grow from 0 without measurement.
      */}
      <div
        className={`${styles.expansion} ${isFocused ? styles.expansionOpen : ''}`}
        aria-hidden={!isFocused}
      >
        <div className={styles.expansionInner}>
          {/*
            Only render the heavy contents when focused. Otherwise the
            pickers' Popover state, draft input listeners, and CtxBadge
            instances stay mounted needlessly across every collapsed row.
          */}
          {isFocused && draft && (
            <ExpandedContent
              task={task}
              draft={draft}
              onDraftChange={onDraftChange}
              onAccept={onAccept}
              onDiscard={onDiscard}
              accepting={accepting}
              discarding={discarding}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ExpandedContentProps {
  task: TaskDto;
  draft: Draft;
  onDraftChange: (next: Draft) => void;
  onAccept: () => void;
  onDiscard: () => void;
  accepting: boolean;
  discarding: boolean;
}

function ExpandedContent({
  task,
  draft,
  onDraftChange,
  onAccept,
  onDiscard,
  accepting,
  discarding,
}: ExpandedContentProps) {
  return (
    <div className={styles.expandedPad}>
      {task.description && (
        <div className={styles.cardBody}>{task.description}</div>
      )}

      <div className={styles.suggested}>
        <span className={styles.suggestedLabel}>Suggested</span>

        <StatusChipPicker
          value={draft.status}
          onChange={(v) => onDraftChange({ ...draft, status: v })}
        />
        <PriorityChipPicker
          value={draft.priority}
          onChange={(v) => onDraftChange({ ...draft, priority: v })}
        />
        <ContextChipPicker
          value={draft.contextId}
          onChange={(v) => onDraftChange({ ...draft, contextId: v })}
        />
        <PersonChipPicker
          value={draft.personId}
          onChange={(v) => onDraftChange({ ...draft, personId: v })}
        />
        <ProjectChipPicker
          value={draft.projectId}
          onChange={(v) => onDraftChange({ ...draft, projectId: v })}
        />
        <DateChipPicker
          label="Due"
          value={draft.dueAt}
          onChange={(v) => onDraftChange({ ...draft, dueAt: v })}
        />
        <DateChipPicker
          label="Scheduled"
          value={draft.scheduledAt}
          onChange={(v) => onDraftChange({ ...draft, scheduledAt: v })}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="kos-btn kos-btn-primary"
          onClick={onAccept}
          disabled={accepting}
        >
          {accepting ? 'Saving…' : 'Accept'}
          <span className="kos-kbd kos-kbd-inverse">⏎</span>
        </button>
        <button
          type="button"
          className={`kos-btn ${styles.deleteBtn}`}
          onClick={onDiscard}
          disabled={discarding}
        >
          {discarding ? '…' : 'Delete'}
          <span className="kos-kbd">⌫</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion chip pickers — interactive, draft-only (no API calls).
// ---------------------------------------------------------------------------

function Chip({
  children,
  trigger,
}: {
  children: ReactNode;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={styles.chip}>
          <span className={styles.chipDot} />
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className={styles.chipPopover}
        >
          <ChipPopoverClose onClose={() => setOpen(false)}>{trigger}</ChipPopoverClose>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChipPopoverClose({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <CloseContext.Provider value={onClose}>{children}</CloseContext.Provider>
  );
}

const CloseContext = createContext<() => void>(() => {});

function ChipList({
  options,
  activeId,
  onPick,
  allowClear,
}: {
  options: Array<{ id: string; label: string; sub?: string | null }>;
  activeId: string | null;
  onPick: (id: string | null) => void;
  allowClear?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(ql) ||
        (o.sub ?? '').toLowerCase().includes(ql),
    );
  }, [q, options]);
  const close = useContext(CloseContext);
  const showSearch = options.length > 8;

  return (
    <div className={styles.chipList}>
      {showSearch && (
        <input
          autoFocus
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={styles.chipSearch}
        />
      )}
      {allowClear && (
        <button
          type="button"
          className={`${styles.chipOption} ${activeId === null ? styles.chipOptionActive : ''}`}
          onClick={() => {
            onPick(null);
            close();
          }}
        >
          <span className={styles.muted}>None</span>
        </button>
      )}
      {filtered.length === 0 ? (
        <div className={styles.chipEmpty}>No matches.</div>
      ) : (
        filtered.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.chipOption} ${
              activeId === opt.id ? styles.chipOptionActive : ''
            }`}
            onClick={() => {
              onPick(opt.id);
              close();
            }}
          >
            {opt.label}
            {opt.sub && <span className={styles.chipOptionSub}>{opt.sub}</span>}
          </button>
        ))
      )}
    </div>
  );
}

function StatusChipPicker({
  value,
  onChange,
}: {
  value: Draft['status'];
  onChange: (v: Draft['status']) => void;
}) {
  return (
    <Chip
      trigger={
        <ChipList
          options={TRIAGE_STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }))}
          activeId={value}
          allowClear
          onPick={(id) =>
            onChange(id as Exclude<TaskDto['status'], 'inbox' | 'done'> | null)
          }
        />
      }
    >
      Status · {value ? STATUS_LABELS[value] : 'set'}
    </Chip>
  );
}

function PriorityChipPicker({
  value,
  onChange,
}: {
  value: TaskDto['priority'];
  onChange: (v: TaskDto['priority']) => void;
}) {
  return (
    <Chip
      trigger={
        <ChipList
          options={TASK_PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABELS[p] }))}
          activeId={value}
          onPick={(id) => onChange((id as TaskDto['priority']) ?? 'routine')}
        />
      }
    >
      Priority · {PRIORITY_LABELS[value]}
    </Chip>
  );
}

function ContextChipPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const contexts = useContexts();
  const list = contexts.data?.contexts ?? [];
  const active = list.find((c) => c.id === value);
  return (
    <Chip
      trigger={
        <ChipList
          options={list.map((c) => ({ id: c.id, label: c.label, sub: c.slug }))}
          activeId={value}
          allowClear
          onPick={onChange}
        />
      }
    >
      Context · {active ? active.label : 'set'}
    </Chip>
  );
}

function PersonChipPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const people = usePeople(false);
  const list = people.data?.people ?? [];
  const active = list.find((p) => p.id === value);
  return (
    <Chip
      trigger={
        <ChipList
          options={list.map((p) => ({ id: p.id, label: p.name, sub: p.role ?? null }))}
          activeId={value}
          allowClear
          onPick={onChange}
        />
      }
    >
      Person · {active ? active.name.split(' ')[0] : 'assign'}
    </Chip>
  );
}

function ProjectChipPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const projects = useProjects(false);
  const list = projects.data?.projects ?? [];
  const active = list.find((p) => p.id === value);
  return (
    <Chip
      trigger={
        <ChipList
          options={list.map((p) => ({ id: p.id, label: p.name, sub: p.outcome }))}
          activeId={value}
          allowClear
          onPick={onChange}
        />
      }
    >
      Project · {active ? active.name : 'link'}
    </Chip>
  );
}

function DateChipPicker({
  label,
  value,
  onChange,
}: {
  label: 'Due' | 'Scheduled';
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  return (
    <Chip
      trigger={
        <DateChipBody label={label} value={value} onChange={onChange} />
      }
    >
      {label} · {value ? formatShortDate(value) : 'pick'}
    </Chip>
  );
}

function DateChipBody({
  label,
  value,
  onChange,
}: {
  label: 'Due' | 'Scheduled';
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const close = useContext(CloseContext);
  return (
    <DatePicker
      label={label}
      value={value}
      onPick={(iso) => {
        onChange(iso);
        close();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers — also re-export the chips that need the UI primitives directly.
// ---------------------------------------------------------------------------

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (sameDay(d, today)) return 'today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(d, tomorrow)) return 'tomorrow';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

