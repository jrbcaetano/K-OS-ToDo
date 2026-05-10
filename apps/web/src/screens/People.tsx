/**
 * People list — split-pane layout. Left: contacts. Right: detail of the
 * selected person (open loops + topics-for-next-conversation placeholder).
 *
 * Selecting a row updates the URL via TanStack Router so back/forward and
 * deep links work. The PersonDetail screen on /people/:id renders the
 * same right-pane content from the params.
 */

import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Avatar, SectionHead, TaskRow } from '@k-os/ui';
import { usePeople, usePerson, usePersonTasks, type PersonDto } from '../api/people';
import { toRowModel } from './_task-row';
import styles from './People.module.css';

export function PeopleScreen() {
  return <PeopleSplit selectedId={null} />;
}

export function PersonDetailRoute() {
  const { id } = useParams({ from: '/people/$id' });
  return <PeopleSplit selectedId={id} />;
}

function PeopleSplit({ selectedId }: { selectedId: string | null }) {
  const list = usePeople();
  const navigate = useNavigate();
  const people = list.data?.people ?? [];

  return (
    <div className={styles.split}>
      <div className={styles.list}>
        {list.isLoading && <div className={styles.empty}>Loading…</div>}
        {!list.isLoading && people.length === 0 && (
          <div className={styles.empty}>No contacts yet.</div>
        )}
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.row} ${selectedId === p.id ? styles.rowActive : ''}`}
            onClick={() => navigate({ to: '/people/$id', params: { id: p.id } })}
          >
            <Avatar person={{ initials: p.initials, color: p.color }} size={28} />
            <span className={styles.rowName}>
              <strong>{p.name}</strong>
              {p.role && <span>{p.role}</span>}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.detail}>
        {!selectedId && (
          <div className={styles.empty}>Select someone to see their open loops.</div>
        )}
        {selectedId && <PersonPanel id={selectedId} />}
      </div>
    </div>
  );
}

function PersonPanel({ id }: { id: string }) {
  const personQ = usePerson(id);
  const tasksQ = usePersonTasks(id);

  if (personQ.isLoading) return <div className={styles.empty}>Loading…</div>;
  if (personQ.isError || !personQ.data)
    return <div className={styles.empty}>Couldn’t load person.</div>;

  const person: PersonDto = personQ.data.person;
  const tasks = tasksQ.data?.tasks ?? [];
  const open = tasks.filter((t) => !t.archivedAt && t.status !== 'done');
  const waiting = open.filter((t) => t.status === 'waiting' || t.status === 'delegated');

  return (
    <>
      <div className={styles.detailHead}>
        <Avatar person={{ initials: person.initials, color: person.color }} size={48} />
        <div>
          <h2 className={styles.detailName}>{person.name}</h2>
          {person.role && <div className={styles.detailRole}>{person.role}</div>}
        </div>
      </div>

      <div className={styles.kpis}>
        <Kpi label="Open loops" value={open.length} />
        <Kpi label="Waiting on them" value={waiting.length} />
        <Kpi
          label="Last seen"
          value={person.lastSeenAt ? formatDate(person.lastSeenAt) : '—'}
        />
      </div>

      {open.length === 0 ? (
        <div className={styles.empty}>No open loops with {person.name.split(' ')[0]}.</div>
      ) : (
        <>
          <SectionHead title="Open loops" count={open.length} />
          {open.map((t) => (
            <TaskRow key={t.id} task={toRowModel(t)} showStatus showProject={false} />
          ))}
        </>
      )}

      <div
        style={{
          marginTop: 18,
          padding: '12px 16px',
          border: '1px dashed var(--line)',
          borderRadius: 8,
          background: 'var(--paper-2)',
          fontSize: 12,
          color: 'var(--ink-3)',
        }}
      >
        <strong style={{ color: 'var(--ink-2)' }}>Topics for next conversation</strong> —
        empty until an external agent posts here. The platform stays deterministic;
        agents own the reasoning.
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-4)' }}>
        <Link to="/waiting">All waiting →</Link>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
