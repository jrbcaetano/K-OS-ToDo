/**
 * Task detail.
 *
 * Lays out the screen the way the prototype does:
 *   - Breadcrumb ("Today › Task") for back navigation.
 *   - Header row: checkbox + title + status / context / project chips +
 *     primary actions ("Mark waiting", "Complete") aligned right.
 *   - Two-column body: description + activity + comments on the left, a
 *     stacked "field card" + (placeholder) Agent suggestions / Evidence
 *     cards on the right.
 *
 * The right-rail fields use the same Radix Popover pickers as before; only
 * their visual chrome changes to match the design's `.field-row` style.
 *
 * Comments are separated from activity by filtering on `kind === 'commented'`
 * (the same table feeds both views, matching the schema's single event log).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Link, useParams } from '@tanstack/react-router';
import {
  CtxBadge,
  Icon,
  PriorityDot,
  SectionHead,
  StatusChip,
  Avatar,
} from '@k-os/ui';
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
import { DatePicker } from '../components/DatePicker';
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

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  const task = taskQ.data?.task;
  const tags = taskQ.data?.tags ?? [];
  const allEvents = taskQ.data?.events ?? [];

  useEffect(() => {
    if (task && !editingDescription) setDescriptionDraft(task.description ?? '');
  }, [task, editingDescription]);

  if (taskQ.isLoading) return <div className={styles.loading}>Loading…</div>;
  if (taskQ.isError || !task) {
    return <div className={styles.error}>Couldn’t load task.</div>;
  }

  const apply = (p: TaskPatch) => patch.mutate({ id: task.id, patch: p });

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    comment.mutate(
      { id: task.id, body: commentDraft.trim() },
      { onSuccess: () => setCommentDraft('') },
    );
  };

  // Split events: comments shown separately under "Comments", everything
  // else goes under "Activity".
  const activity = allEvents.filter((e) => e.kind !== 'commented');
  const comments = allEvents.filter((e) => e.kind === 'commented');

  return (
    <div className={styles.shell}>
      <div className={styles.crumb}>
        <Link to="/" className={styles.crumbLink}>
          Today
        </Link>
        <Icon name="chevron" size={11} />
        <span className={styles.crumbActive}>Task</span>
      </div>

      <div className={styles.header}>
        <span
          className={[
            styles.headerCheck,
            task.priority === 'critical' && styles.checkCritical,
            task.priority === 'important' && styles.checkImportant,
            task.status === 'done' && styles.checkDone,
          ]
            .filter(Boolean)
            .join(' ')}
          role="button"
          tabIndex={0}
          aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
          onClick={() => complete.mutate(task.id)}
        />
        <div className={styles.headerMain}>
          <h2 className={styles.title}>{task.title}</h2>
          <div className={styles.titleMeta}>
            <StatusChip status={task.status} />
            {task.context && (
              <CtxBadge label={task.context.label} color={task.context.color} />
            )}
            {task.project && <span className={styles.projChip}>{task.project.name}</span>}
            {!task.project && task.area && (
              <span className={styles.projChip}>{task.area.name}</span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          {task.status !== 'waiting' && task.status !== 'done' && (
            <button
              type="button"
              className="kos-btn"
              onClick={() => apply({ status: 'waiting' })}
              disabled={patch.isPending}
            >
              Mark waiting
            </button>
          )}
          <button
            type="button"
            className="kos-btn kos-btn-primary"
            onClick={() => complete.mutate(task.id)}
            disabled={task.status === 'done' || complete.isPending}
          >
            <Icon name="check" size={12} />
            {task.status === 'done' ? 'Completed' : 'Complete'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>
          <div className={styles.sectionLabel}>Description</div>
          {editingDescription ? (
            <div className={styles.descEdit}>
              <textarea
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
              <div className={styles.descEditFoot}>
                <span className="kos-kbd">⌘↵</span> save ·{' '}
                <span className="kos-kbd">Esc</span> cancel
              </div>
            </div>
          ) : (
            <div
              className={`${styles.descDisplay} ${task.description ? '' : styles.descEmpty}`}
              onClick={() => setEditingDescription(true)}
            >
              {task.description || 'Add a description, paste a link, dump context…'}
              <span className={styles.descAffordance}>click to edit</span>
            </div>
          )}

          <SectionHead
            title="Activity"
            count={activity.length}
            alert={activity.length > 5 ? 'scroll for more' : null}
          />
          {activity.length === 0 ? (
            <div className={styles.empty}>No activity yet.</div>
          ) : (
            <div className={styles.activityScroll}>
              {activity.map((e) => (
                <ActivityItem key={e.id} event={e} tags={tags} />
              ))}
            </div>
          )}
          {activity.length > 0 && (
            <div className={styles.activityFoot}>
              <span>
                {activity.length} of {activity.length} events
              </span>
              {activity.length >= 50 && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={styles.activityFootLink}>Load more</span>
                </>
              )}
            </div>
          )}

          <div className={styles.commentsSection}>
            <SectionHead title="Comments" count={comments.length} />
            {comments.length === 0 ? (
              <div className={styles.empty}>No comments yet.</div>
            ) : (
              comments.map((e) => <CommentCard key={e.id} event={e} />)
            )}
            <form
              className={styles.commentForm}
              onSubmit={(ev) => {
                ev.preventDefault();
                submitComment();
              }}
            >
              <input
                className={styles.commentInput}
                placeholder="Add a comment or paste a link…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <span className="kos-kbd" aria-hidden>
                ⌘↵
              </span>
              <button
                type="submit"
                className="kos-btn kos-btn-primary"
                disabled={!commentDraft.trim() || comment.isPending}
              >
                Post
              </button>
            </form>
          </div>
        </div>

        <div className={styles.rail}>
          <div className={styles.card}>
            <FieldPickerRow
              label="Status"
              valueEmpty={false}
              picker={(close) => (
                <PickerList
                  options={TASK_STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }))}
                  activeId={task.status}
                  onPick={(idArg) => {
                    apply({ status: idArg as TaskDto['status'] });
                    close();
                  }}
                />
              )}
            >
              <StatusChip status={task.status} />
            </FieldPickerRow>

            <FieldPickerRow
              label="Priority"
              valueEmpty={false}
              picker={(close) => (
                <PickerList
                  options={TASK_PRIORITIES.map((p) => ({
                    id: p,
                    label: PRIORITY_LABELS[p],
                  }))}
                  activeId={task.priority}
                  onPick={(idArg) => {
                    apply({ priority: idArg as TaskDto['priority'] });
                    close();
                  }}
                />
              )}
            >
              <PriorityDot priority={task.priority} />
              <span>{PRIORITY_LABELS[task.priority]}</span>
            </FieldPickerRow>

            <DateField
              label="Due"
              value={task.dueAt}
              onPick={(d) => apply({ dueAt: d })}
            />
            <DateField
              label="Scheduled"
              value={task.scheduledAt}
              onPick={(d) => apply({ scheduledAt: d })}
            />
            <DateField
              label="Review"
              value={task.reviewAt}
              onPick={(d) => apply({ reviewAt: d })}
            />

            <ProjectField task={task} onPick={(idArg) => apply({ projectId: idArg })} />
            <AreaField task={task} onPick={(idArg) => apply({ areaId: idArg })} />
            <ContextField task={task} onPick={(idArg) => apply({ contextId: idArg })} />
            <PersonField task={task} onPick={(idArg) => apply({ personId: idArg })} />

            <FieldRow label="Source" valueEmpty={!task.sourceKind}>
              <span className={styles.sourceText}>
                {task.sourceKind ? task.sourceKind.replace('_', ' ') : '—'}
              </span>
            </FieldRow>

            <FieldRow label="Tags" valueEmpty={tags.length === 0} last>
              {tags.length === 0 ? (
                <span className={styles.muted}>none</span>
              ) : (
                <span className={styles.tagsWrap}>
                  {tags.map((t) => (
                    <span key={t.id} className={styles.tagBadge}>
                      {t.name}
                    </span>
                  ))}
                </span>
              )}
            </FieldRow>
          </div>

          {/*
            Placeholder slot for "Agent suggestions" and "Evidence" cards.
            Per ADR 0020 those are agent-fed; we render them once the
            external agent service POSTs to the platform.
          */}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field rows + pickers
// ---------------------------------------------------------------------------

interface FieldPickerRowProps {
  label: string;
  children: ReactNode;
  valueEmpty: boolean;
  picker: (close: () => void) => ReactNode;
  last?: boolean;
}

function FieldPickerRow({
  label,
  children,
  valueEmpty,
  picker,
  last = false,
}: FieldPickerRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div
          className={`${styles.fieldRow} ${styles.fieldRowEditable} ${
            open ? styles.fieldRowOpen : ''
          } ${last ? styles.fieldRowLast : ''}`}
          role="button"
          tabIndex={0}
        >
          <span className={styles.fieldLabel}>{label}</span>
          <span
            className={`${styles.fieldValue} ${valueEmpty ? styles.muted : ''}`}
          >
            {children}
          </span>
          <span className={styles.fieldAffordance}>click ▾</span>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          className={styles.pickerContent}
        >
          {picker(() => setOpen(false))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FieldRow({
  label,
  children,
  valueEmpty,
  last = false,
}: {
  label: string;
  children: ReactNode;
  valueEmpty: boolean;
  last?: boolean;
}) {
  return (
    <div className={`${styles.fieldRow} ${last ? styles.fieldRowLast : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue} ${valueEmpty ? styles.muted : ''}`}>
        {children}
      </span>
    </div>
  );
}

interface ListPickerOption {
  id: string;
  label: string;
  sub?: string | null;
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
    <div className={styles.pickerList}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`${styles.pickerOption} ${
            activeId === opt.id ? styles.pickerOptionActive : ''
          }`}
          onClick={() => onPick(opt.id)}
        >
          {opt.label}
          {opt.sub && <span className={styles.pickerSub}>{opt.sub}</span>}
        </button>
      ))}
    </div>
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
      (o) =>
        o.label.toLowerCase().includes(ql) ||
        (o.sub ?? '').toLowerCase().includes(ql),
    );
  }, [q, options]);

  return (
    <div className={styles.pickerSearchable}>
      <input
        className={styles.pickerSearchInput}
        autoFocus
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className={styles.pickerList}>
        {allowClear && (
          <button
            type="button"
            className={`${styles.pickerOption} ${activeId === null ? styles.pickerOptionActive : ''}`}
            onClick={() => onPick(null)}
          >
            <span className={styles.muted}>None</span>
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
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string | null;
  onPick: (iso: string | null) => void;
}) {
  return (
    <FieldPickerRow
      label={label}
      valueEmpty={!value}
      picker={(close) => (
        <DatePicker
          label={label}
          value={value}
          onPick={(iso) => {
            onPick(iso);
            close();
          }}
        />
      )}
    >
      {value ? (
        <span className={styles.dateValue}>{formatDate(value)}</span>
      ) : (
        <span className={styles.muted}>—</span>
      )}
    </FieldPickerRow>
  );
}

function ProjectField({
  task,
  onPick,
}: {
  task: TaskDto;
  onPick: (id: string | null) => void;
}) {
  const projects = useProjects(false);
  const list = projects.data?.projects ?? [];
  const active = list.find((p) => p.id === task.projectId);
  const options = list.map((p) => ({ id: p.id, label: p.name, sub: p.outcome }));
  return (
    <FieldPickerRow
      label="Project"
      valueEmpty={!active}
      picker={(close) => (
        <SearchablePickerList
          options={options}
          activeId={task.projectId}
          allowClear
          onPick={(idArg) => {
            onPick(idArg);
            close();
          }}
        />
      )}
    >
      {active ? <span className={styles.projChip}>{active.name}</span> : <span className={styles.muted}>—</span>}
    </FieldPickerRow>
  );
}

function AreaField({
  task,
  onPick,
}: {
  task: TaskDto;
  onPick: (id: string | null) => void;
}) {
  const areas = useAreas(false);
  const list = areas.data?.areas ?? [];
  const active = list.find((a) => a.id === task.areaId);
  const options = list.map((a) => ({ id: a.id, label: a.name, sub: a.standard }));
  return (
    <FieldPickerRow
      label="Area"
      valueEmpty={!active}
      picker={(close) => (
        <SearchablePickerList
          options={options}
          activeId={task.areaId}
          allowClear
          onPick={(idArg) => {
            onPick(idArg);
            close();
          }}
        />
      )}
    >
      {active ? <span>{active.name}</span> : <span className={styles.muted}>—</span>}
    </FieldPickerRow>
  );
}

function ContextField({
  task,
  onPick,
}: {
  task: TaskDto;
  onPick: (id: string | null) => void;
}) {
  const contexts = useContexts();
  const list = contexts.data?.contexts ?? [];
  const active = list.find((c) => c.id === task.contextId);
  const options = list.map((c) => ({ id: c.id, label: c.label, sub: c.slug }));
  return (
    <FieldPickerRow
      label="Context"
      valueEmpty={!active}
      picker={(close) => (
        <SearchablePickerList
          options={options}
          activeId={task.contextId}
          allowClear
          onPick={(idArg) => {
            onPick(idArg);
            close();
          }}
        />
      )}
    >
      {active ? (
        <CtxBadge label={active.label} color={active.color} />
      ) : (
        <span className={styles.muted}>—</span>
      )}
    </FieldPickerRow>
  );
}

function PersonField({
  task,
  onPick,
}: {
  task: TaskDto;
  onPick: (id: string | null) => void;
}) {
  const people = usePeople(false);
  const list = people.data?.people ?? [];
  const active = list.find((p) => p.id === task.personId);
  const options = list.map((p) => ({ id: p.id, label: p.name, sub: p.role ?? null }));
  return (
    <FieldPickerRow
      label="Person"
      valueEmpty={!active}
      picker={(close) => (
        <SearchablePickerList
          options={options}
          activeId={task.personId}
          allowClear
          onPick={(idArg) => {
            onPick(idArg);
            close();
          }}
        />
      )}
    >
      {active ? (
        <span className={styles.personValue}>
          <Avatar
            person={{ initials: active.initials, color: active.color }}
            size={16}
          />
          {active.name}
        </span>
      ) : (
        <span className={styles.muted}>—</span>
      )}
    </FieldPickerRow>
  );
}

// ---------------------------------------------------------------------------
// Activity + comments
// ---------------------------------------------------------------------------

function ActivityItem({
  event,
  tags,
}: {
  event: TaskEventDto;
  tags: TaskTagDto[];
}) {
  void tags;
  const date = new Date(event.createdAt);
  const time = `${weekday(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const accent =
    event.kind === 'created' ||
    event.actorKind === 'agent' ||
    event.kind === 'commented';
  return (
    <div className={styles.activityItem}>
      <span
        className={`${styles.activityDot} ${accent ? styles.activityDotAccent : ''}`}
      />
      <span className={styles.activityBody}>{describeEvent(event)}</span>
      <span className={styles.activityTime}>{time}</span>
    </div>
  );
}

function CommentCard({ event }: { event: TaskEventDto }) {
  const date = new Date(event.createdAt);
  const body =
    typeof (event.payload as Record<string, unknown> | null)?.body === 'string'
      ? ((event.payload as { body: string }).body)
      : '';
  return (
    <div className={styles.commentCard}>
      <div className={styles.commentHead}>
        <strong>You</strong>
        <span className={styles.commentTime}>
          {weekday(date)} {pad(date.getHours())}:{pad(date.getMinutes())}
        </span>
      </div>
      <div className={styles.commentBody}>{body}</div>
    </div>
  );
}

function describeEvent(e: TaskEventDto): ReactNode {
  const p = e.payload as Record<string, unknown> | null;
  const actor = e.actorKind === 'agent' ? 'Agent' : 'You';
  switch (e.kind) {
    case 'created':
      return (
        <>
          <strong>{actor}</strong> · created
        </>
      );
    case 'completed':
      return (
        <>
          <strong>{actor}</strong> · marked complete
        </>
      );
    case 'archived':
      return (
        <>
          <strong>{actor}</strong> · archived
        </>
      );
    case 'restored':
      return (
        <>
          <strong>{actor}</strong> · restored
        </>
      );
    case 'status_changed':
      return (
        <>
          <strong>{actor}</strong> · status {String(p?.from ?? '—')} →{' '}
          {String(p?.to ?? '—')}
        </>
      );
    case 'priority_changed':
      return (
        <>
          <strong>{actor}</strong> · priority {String(p?.from ?? '—')} →{' '}
          {String(p?.to ?? '—')}
        </>
      );
    case 'field_edited': {
      const field = (p?.field as string) ?? '?';
      return (
        <>
          <strong>{actor}</strong> · edited {field}
        </>
      );
    }
    case 'commented':
      return (
        <>
          <strong>{actor}</strong> · commented
        </>
      );
    default:
      return (
        <>
          <strong>{actor}</strong> · {e.kind}
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function weekday(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]!;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${weekday(d)} ${d.getDate()} ${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      d.getMonth()
    ]
  }`;
}
