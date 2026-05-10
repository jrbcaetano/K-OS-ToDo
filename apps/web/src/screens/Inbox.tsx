/**
 * Inbox screen — single-item triage with keyboard shortcuts.
 *
 * Keyboard map (matches the prototype's Inbox triage card):
 *   N → status='next'
 *   S → status='scheduled'
 *   W → status='waiting'
 *   D → status='delegated'
 *   Z → discard
 *   J / ↓ → next item
 *   K / ↑ → previous item
 *
 * Per [[0020 - agent-native-architecture-agents-external-to-platform]]
 * the platform doesn't generate suggestions. An external agent observes
 * new inbox rows and PATCHes `ai_parsed`; once that field is populated,
 * the triage UI can surface accept/reject chips for each suggested field.
 * That render path lands when an agent service is built.
 */

import { useEffect, useState } from 'react';
import { useDiscardInbox, useInbox, useTriage, type TriageInput } from '../api/inbox';
import styles from './Inbox.module.css';

export function InboxScreen() {
  const query = useInbox();
  const triage = useTriage();
  const discard = useDiscardInbox();
  const [idx, setIdx] = useState(0);

  const items = query.data?.tasks ?? [];
  const item = items[Math.min(idx, items.length - 1)];

  // Reset index when the list shrinks past it.
  useEffect(() => {
    if (idx > 0 && idx >= items.length) setIdx(Math.max(0, items.length - 1));
  }, [idx, items.length]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!item) return;
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
      const key = e.key.toLowerCase();
      const apply = (status: TriageInput['status']) => {
        e.preventDefault();
        triage.mutate({ id: item.id, input: { status } });
      };
      switch (key) {
        case 'n':
          apply('next');
          break;
        case 's':
          apply('scheduled');
          break;
        case 'w':
          apply('waiting');
          break;
        case 'd':
          apply('delegated');
          break;
        case 'z':
          e.preventDefault();
          discard.mutate(item.id);
          break;
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          setIdx((i) => Math.min(items.length - 1, i + 1));
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          setIdx((i) => Math.max(0, i - 1));
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [item, items.length, triage, discard]);

  if (query.isLoading) return <div className={styles.empty}>Loading…</div>;
  if (query.isError) return <div className={styles.empty}>Couldn’t load inbox.</div>;
  if (items.length === 0) {
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
        <h2 className={styles.title}>Inbox</h2>
        <span className={styles.hint}>
          <span>Triage one at a time</span>
          <span className={styles.kbd}>J</span>
          <span className={styles.kbd}>K</span>
          <span>to navigate</span>
        </span>
      </div>
      <div className={styles.meta}>
        {items.length} items waiting · viewing {Math.min(idx + 1, items.length)} / {items.length}
      </div>

      <div className={styles.card}>
        <div className={styles.source}>
          <span>{item.sourceKind ?? 'manual'}</span>
          <span style={{ color: 'var(--ink-5)' }}>·</span>
          <span>captured {formatRelative(new Date(item.createdAt))}</span>
        </div>
        <h3 className={styles.itemTitle}>{item.title}</h3>
        {item.description && <div className={styles.itemBody}>{item.description}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => triage.mutate({ id: item.id, input: { status: 'next' } })}>
            Next <span className={styles.kbd}>N</span>
          </button>
          <button type="button" className={styles.btn} onClick={() => triage.mutate({ id: item.id, input: { status: 'scheduled' } })}>
            Schedule <span className={styles.kbd}>S</span>
          </button>
          <button type="button" className={styles.btn} onClick={() => triage.mutate({ id: item.id, input: { status: 'waiting' } })}>
            Waiting <span className={styles.kbd}>W</span>
          </button>
          <button type="button" className={styles.btn} onClick={() => triage.mutate({ id: item.id, input: { status: 'delegated' } })}>
            Delegate <span className={styles.kbd}>D</span>
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => discard.mutate(item.id)}>
            Discard <span className={styles.kbd}>Z</span>
          </button>
        </div>
      </div>
    </>
  );
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
