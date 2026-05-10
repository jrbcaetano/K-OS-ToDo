/**
 * Task detail.
 *
 * Loads /tasks/:id (task + tags + last 50 events). Right-rail rows are
 * Popover-based pickers that PATCH the task in place. Activity log is
 * scroll-capped at 240px with a "showing N of M" footer; the
 * /tasks/:id/events endpoint exists for paginating beyond that.
 *
 * Pickers in this block are inline (apps/web). When a third or fourth
 * screen needs the same picker shape, they graduate to @k-os/ui's
 * `components/pickers/` per ADR 0004's plan.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useParams } from '@tanstack/react-router';
import { TASK_STATUSES, TASK_PRIORITIES } from '@k-os/core';
import {
  useCommentOnTask,
  useCompleteTask,
  usePatchTask,
  useTask,
  type TaskDto,
  type TaskEventDto,
  type TaskPatch,
  type TaskTagDto,
} from '../api/tasks';
import { useContexts } from '../api/catalog';
import { useProjects } from '../api/projects';
import { useAreas } from '../api/areas';
import { usePeople } from '../api/people';
import styles from './TaskDetail.module.css';

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

export function TaskDetailScreen() {
  const { id } = useParams({ from: '/tasks/$id' });
  const taskQ = useTask(id);
  const patch = usePatchTask();
  const complete = useCompleteTask();
  const comment = useCommentOnTask();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  const task = taskQ.data?.task;
  const tags = taskQ.data?.tags ?? [];
  const events = taskQ.data?.events ?? [];

  useEffect(() => {
    if (task && !editingTitle) setTitleDraft(task.title);
    if (task && !editingDescription) setDescriptionDraft(task.description ?? '');
  }, [task, editingTitle, editingDescription]);

  if (taskQ.isLoading) return <div>Loading…</div>;
  if (taskQ.isError || !task) return <div>Couldn’t load task.</div>;

  const apply = (p: TaskPatch) => patch.mutate({ id: task.id, patch: p });

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    comment.mutate(
      { id: task.id, body: commentDraft.trim() },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  return (
    <div className={styles.layout}>
      <div>
        {editingTitle ? (
          <input
            className={styles.title}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft.trim() && titleDraft !== task.title) {
                apply({ title: titleDraft.trim() });
              }
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
              if (e.key === 'Escape') {
                setTitleDraft(task.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <h2 className={styles.title} onClick={() => setEditingTitle(true)}>
            {task.title}
          </h2>
        )}
        <div className={styles.metaLine}>
          {STATUS_LABELS[task.status]} · {PRIORITY_LABELS[task.priority]} ·
          created {new Date(task.createdAt).toLocaleDateString()}
        </div>

        <div className={styles.descriptionLabel}>Description</div>
        {editingDescription ? (
          <>
            <textarea
              className={styles.descriptionEdit}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  apply({ description: descriptionDraft.trim() || null });
                  setEditingDescription(false);
                }
                if (e.key === 'Escape') {
                  setDescriptionDraft(task.description ?? '');
                  setEditingDescription(false);
                }
              }}
              autoFocus
            />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-4)' }}>
              ⌘↵ to save · Esc to cancel
            </div>
          </>
        ) : (
          <div
            className={`${styles.description} ${task.description ? '' : styles.descriptionEmpty}`}
            onClick={() => setEditingDescription(true)}
          >
            {task.description || 'Click to add a description…'}
          </div>
        )}

        <div className={styles.divider} />

        <button
          type="button"
          onClick={() => complete.mutate(task.id)}
          disabled={task.status === 'done' || complete.isPending}
          style={{
            height: 30,
            padding: '0 14px',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {task.status === 'done' ? 'Completed' : 'Mark complete'}
        </button>

        <div className={styles.divider} />

        <div className={styles.descriptionLabel}>Activity</div>
        <div className={styles.events}>
          {events.length === 0 ? (
            <div className={styles.eventCount}>No events yet.</div>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} tags={tags} />)
          )}
        </div>
        {events.length === 50 && (
          <div className={styles.eventCount}>Showing the latest 50 events.</div>
        )}

        <form
          className={styles.commentForm}
          onSubmit={(e) => {
            e.preventDefault();
            submitComment();
          }}
        >
          <input
            className={styles.commentInput}
            placeholder="Add a comment…"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
          />
          <button
            type="submit"
            className={styles.commentBtn}
            disabled={!commentDraft.trim() || comment.isPending}
          >
            Post
          </button>
        </form>
      </div>

      <div className={styles.rail}>
        <ListPickerRow
          label="Status"
          value={STATUS_LABELS[task.status]}
          options={TASK_STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }))}
          activeId={task.status}
          onPick={(id) => apply({ status: id as TaskDto['status'] })}
        />
        <ListPickerRow
          label="Priority"
          value={PRIORITY_LABELS[task.priority]}
          options={TASK_PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABELS[p] }))}
          activeId={task.priority}
          onPick={(id) => apply({ priority: id as TaskDto['priority'] })}
        />
        <DatePickerRow label="Due" value={task.dueAt} onPick={(d) => apply({ dueAt: d })} />
        <DatePickerRow
          label="Scheduled"
          value={task.scheduledAt}
          onPick={(d) => apply({ scheduledAt: d })}
        />
        <DatePickerRow
          label="Review"
          value={task.reviewAt}
          onPick={(d) => apply({ reviewAt: d })}
        />
        <ProjectRow task={task} onPick={(id) => apply({ projectId: id })} />
        <AreaRow task={task} onPick={(id) => apply({ areaId: id })} />
        <ContextRow task={task} onPick={(id) => apply({ contextId: id })} />
        <PersonRow task={task} onPick={(id) => apply({ personId: id })} />
        <div className={styles.railRow}>
          <span className={styles.railLabel}>Tags</span>
          <span style={{ textAlign: 'right' }}>
            {tags.length === 0 ? (
              <span className={styles.railValueEmpty}>none</span>
            ) : (
              tags.map((t) => (
                <span key={t.id} className={styles.tagChip}>
                  {t.name}
                </span>
              ))
            )}
          </span>
        </div>
        {task.sourceKind && (
          <div className={styles.railRow}>
            <span className={styles.railLabel}>Source</span>
            <span className={styles.railValue}>{task.sourceKind}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Picker rows
// ---------------------------------------------------------------------------

interface ListPickerOption {
  id: string;
  label: string;
  sub?: string | null;
}

function ListPickerRow({
  label,
  value,
  options,
  activeId,
  onPick,
}: {
  label: string;
  value: string;
  options: ListPickerOption[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <PickerRow label={label} valueLabel={value} valueEmpty={false}>
      {(close) => (
        <PickerList
          options={options}
          activeId={activeId}
          onPick={(id) => {
            onPick(id);
            close();
          }}
        />
      )}
    </PickerRow>
  );
}

function DatePickerRow({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string | null;
  onPick: (iso: string | null) => void;
}) {
  const valueLabel = value ? new Date(value).toLocaleDateString() : 'none';
  return (
    <PickerRow label={label} valueLabel={valueLabel} valueEmpty={!value}>
      {(close) => (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="date"
            defaultValue={value ? value.slice(0, 10) : ''}
            onChange={(e) => {
              const v = e.target.value;
              onPick(v ? new Date(v).toISOString() : null);
              close();
            }}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '6px 8px',
              font: 'inherit',
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onPick(null);
                close();
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </PickerRow>
  );
}

function ProjectRow({ task, onPick }: { task: TaskDto; onPick: (id: string | null) => void }) {
  const projects = useProjects(false);
  const list = projects.data?.projects ?? [];
  const active = list.find((p) => p.id === task.projectId);
  const options = list.map((p) => ({ id: p.id, label: p.name, sub: p.outcome }));
  return (
    <RecordPickerRow
      label="Project"
      activeId={task.projectId}
      activeLabel={active?.name ?? null}
      options={options}
      onPick={onPick}
    />
  );
}

function AreaRow({ task, onPick }: { task: TaskDto; onPick: (id: string | null) => void }) {
  const areas = useAreas(false);
  const list = areas.data?.areas ?? [];
  const active = list.find((a) => a.id === task.areaId);
  const options = list.map((a) => ({ id: a.id, label: a.name, sub: a.standard }));
  return (
    <RecordPickerRow
      label="Area"
      activeId={task.areaId}
      activeLabel={active?.name ?? null}
      options={options}
      onPick={onPick}
    />
  );
}

function ContextRow({ task, onPick }: { task: TaskDto; onPick: (id: string | null) => void }) {
  const contexts = useContexts();
  const list = contexts.data?.contexts ?? [];
  const active = list.find((c) => c.id === task.contextId);
  const options = list.map((c) => ({ id: c.id, label: c.label, sub: c.slug }));
  return (
    <RecordPickerRow
      label="Context"
      activeId={task.contextId}
      activeLabel={active?.label ?? null}
      options={options}
      onPick={onPick}
    />
  );
}

function PersonRow({ task, onPick }: { task: TaskDto; onPick: (id: string | null) => void }) {
  const people = usePeople(false);
  const list = people.data?.people ?? [];
  const active = list.find((p) => p.id === task.personId);
  const options = list.map((p) => ({ id: p.id, label: p.name, sub: p.role ?? null }));
  return (
    <RecordPickerRow
      label="Person"
      activeId={task.personId}
      activeLabel={active?.name ?? null}
      options={options}
      onPick={onPick}
    />
  );
}

function RecordPickerRow({
  label,
  activeId,
  activeLabel,
  options,
  onPick,
}: {
  label: string;
  activeId: string | null;
  activeLabel: string | null;
  options: ListPickerOption[];
  onPick: (id: string | null) => void;
}) {
  return (
    <PickerRow
      label={label}
      valueLabel={activeLabel ?? 'none'}
      valueEmpty={!activeLabel}
    >
      {(close) => (
        <SearchablePickerList
          options={options}
          activeId={activeId}
          allowClear
          onPick={(id) => {
            onPick(id);
            close();
          }}
        />
      )}
    </PickerRow>
  );
}

function PickerRow({
  label,
  valueLabel,
  valueEmpty,
  children,
}: {
  label: string;
  valueLabel: string;
  valueEmpty: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={styles.railRow}>
        <span className={styles.railLabel}>{label}</span>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`${styles.railValue} ${valueEmpty ? styles.railValueEmpty : ''}`}
          >
            {valueLabel}
          </button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content side="left" align="start" sideOffset={8} className={styles.pickerContent}>
          {children(() => setOpen(false))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PickerList({
  options,
  activeId,
  onPick,
}: {
  options: ListPickerOption[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`${styles.pickerOption} ${activeId === opt.id ? styles.pickerOptionActive : ''}`}
          onClick={() => onPick(opt.id)}
        >
          {opt.label}
          {opt.sub && <span className={styles.pickerSub}>{opt.sub}</span>}
        </button>
      ))}
    </>
  );
}

function SearchablePickerList({
  options,
  activeId,
  allowClear,
  onPick,
}: {
  options: ListPickerOption[];
  activeId: string | null;
  allowClear?: boolean;
  onPick: (id: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(ql) || o.sub?.toLowerCase().includes(ql),
    );
  }, [q, options]);
  return (
    <>
      <input
        className={styles.pickerSearch}
        autoFocus
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {allowClear && (
        <button
          type="button"
          className={`${styles.pickerOption} ${activeId === null ? styles.pickerOptionActive : ''}`}
          onClick={() => onPick(null)}
        >
          <span style={{ color: 'var(--ink-4)' }}>None</span>
        </button>
      )}
      {filtered.length === 0 ? (
        <div className={styles.pickerEmpty}>No matches.</div>
      ) : (
        filtered.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.pickerOption} ${activeId === opt.id ? styles.pickerOptionActive : ''}`}
            onClick={() => onPick(opt.id)}
          >
            {opt.label}
            {opt.sub && <span className={styles.pickerSub}>{opt.sub}</span>}
          </button>
        ))
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

function EventRow({ event, tags }: { event: TaskEventDto; tags: TaskTagDto[] }) {
  void tags;
  const date = new Date(event.createdAt);
  return (
    <div className={styles.event}>
      <span className={styles.eventDate}>
        {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{' '}
        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className={styles.eventBody}>{describeEvent(event)}</span>
    </div>
  );
}

function describeEvent(e: TaskEventDto): string {
  const p = e.payload as Record<string, unknown> | null;
  switch (e.kind) {
    case 'created':
      return 'Created.';
    case 'completed':
      return 'Marked complete.';
    case 'archived':
      return 'Archived.';
    case 'restored':
      return 'Restored.';
    case 'status_changed':
      return `Status: ${p?.from ?? '—'} → ${p?.to ?? '—'}`;
    case 'priority_changed':
      return `Priority: ${p?.from ?? '—'} → ${p?.to ?? '—'}`;
    case 'field_edited': {
      const field = p?.field ?? '?';
      const from = formatVal(p?.from);
      const to = formatVal(p?.to);
      return `${field}: ${from} → ${to}`;
    }
    case 'commented':
      return typeof p?.body === 'string' ? `“${p.body}”` : 'Commented.';
    default:
      return e.kind;
  }
}
function formatVal(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleDateString();
  }
  return String(v);
}
