/**
 * Areas list — same shape as Projects (cards + active/archived tabs).
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAreas, type AreaDto } from '../api/areas';
import styles from './Projects.module.css';

export function AreasScreen() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const query = useAreas(tab === 'archived');
  const areas = query.data?.areas ?? [];

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Areas</h2>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
            onClick={() => setTab('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'archived' ? styles.tabActive : ''}`}
            onClick={() => setTab('archived')}
          >
            Archived
          </button>
        </div>
      </div>

      {query.isLoading && <div className={styles.empty}>Loading…</div>}
      {!query.isLoading && areas.length === 0 && (
        <div className={styles.empty}>
          {tab === 'active' ? 'No active areas yet.' : 'No archived areas.'}
        </div>
      )}

      <div className={styles.grid}>
        {areas.map((a) => (
          <AreaCard key={a.id} area={a} archived={tab === 'archived'} />
        ))}
      </div>
    </>
  );
}

function AreaCard({ area, archived }: { area: AreaDto; archived: boolean }) {
  return (
    <Link to="/areas/$id" params={{ id: area.id }} className={styles.card}>
      <div className={styles.cardName}>{area.name}</div>
      <div className={styles.cardOutcome} style={{ fontStyle: 'italic' }}>
        {area.standard}
      </div>
      <div className={styles.cardMeta}>
        {area.cadence && <span>{area.cadence}</span>}
        {area.nextReviewAt && (
          <span>· next review {new Date(area.nextReviewAt).toLocaleDateString()}</span>
        )}
        {archived && area.archiveReason && (
          <span className={styles.archiveLabel}>· {area.archiveReason}</span>
        )}
      </div>
    </Link>
  );
}
