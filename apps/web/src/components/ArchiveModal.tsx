/**
 * Archive modal — reusable for projects and areas.
 *
 * Per the prototype's "out of sight, not gone" copy: archived items keep
 * their tasks; active views just stop surfacing them. Reason picker uses
 * the schema's ARCHIVE_REASONS enum; note is optional.
 */

import { useEffect, useState } from 'react';
import type { ArchiveReason } from '../api/projects';
import styles from './ArchiveModal.module.css';

export const ARCHIVE_REASONS: { value: ArchiveReason; label: string; hint: string }[] = [
  { value: 'completed', label: 'Completed', hint: 'It’s done.' },
  { value: 'dropped', label: 'Dropped', hint: 'Not pursuing this.' },
  { value: 'paused', label: 'Paused', hint: 'On hold for now.' },
  { value: 'replaced', label: 'Replaced', hint: 'Superseded by another.' },
];

export interface ArchiveModalProps {
  open: boolean;
  entityKind: 'project' | 'area';
  entityName: string;
  onClose: () => void;
  onConfirm: (input: { reason: ArchiveReason; note: string | null }) => void;
  pending?: boolean;
}

export function ArchiveModal({
  open,
  entityKind,
  entityName,
  onClose,
  onConfirm,
  pending = false,
}: ArchiveModalProps) {
  const [reason, setReason] = useState<ArchiveReason | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!reason) return;
    onConfirm({ reason, note: note.trim() || null });
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Archive ${entityKind}`}
      >
        <div className={styles.head}>
          <h3 className={styles.title}>Archive “{entityName}”?</h3>
          <p className={styles.copy}>
            Out of sight, not gone — its tasks stay searchable, just hidden from active
            views. You can restore at any time.
          </p>
        </div>
        <div className={styles.body}>
          <div className={styles.label}>Reason</div>
          <div className={styles.reasons}>
            {ARCHIVE_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`${styles.reasonBtn} ${
                  reason === r.value ? styles.reasonBtnActive : ''
                }`}
                onClick={() => setReason(r.value)}
              >
                <strong>{r.label}</strong>
                <span style={{ color: 'var(--ink-3)', marginLeft: 8, fontSize: 11 }}>
                  {r.hint}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.label}>Note (optional)</div>
          <textarea
            className={styles.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A line for future-you about why."
          />
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={submit}
            disabled={!reason || pending}
          >
            {pending ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
