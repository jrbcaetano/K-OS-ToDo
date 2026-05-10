/**
 * Projects list — card grid with active / archived sub-tabs.
 *
 * Click-through to /projects/:id (ProjectDetail) for the per-project view.
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProjects, type ProjectDto } from '../api/projects';
import styles from './Projects.module.css';

export function ProjectsScreen() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const query = useProjects(tab === 'archived');
  const projects = query.data?.projects ?? [];

  return (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>Projects</h2>
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
      {!query.isLoading && projects.length === 0 && (
        <div className={styles.empty}>
          {tab === 'active' ? 'No active projects.' : 'No archived projects.'}
        </div>
      )}

      <div className={styles.grid}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} archived={tab === 'archived'} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project, archived }: { project: ProjectDto; archived: boolean }) {
  return (
    <Link to="/projects/$id" params={{ id: project.id }} className={styles.card}>
      <div className={styles.cardName}>{project.name}</div>
      <div className={styles.cardOutcome}>{project.outcome}</div>
      <div className={styles.cardMeta}>
        <span className={styles.statusPill}>{readableStatus(project.status)}</span>
        {project.targetDate && <span>· due {project.targetDate}</span>}
        {archived && project.archiveReason && (
          <span className={styles.archiveLabel}>· {project.archiveReason}</span>
        )}
      </div>
    </Link>
  );
}

function readableStatus(s: string): string {
  return s.replace(/_/g, ' ');
}
