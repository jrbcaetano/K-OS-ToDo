/**
 * Quick Capture modal.
 *
 * Triggered by ⌘K (cmd-k) globally; saves to /api/inbox/capture and closes.
 *
 * Slash menu: typing `/` opens a kind-picker (Status / Priority / Due /
 * Person / Project / Area / Context). For Block 11 the picker is a
 * lightweight kinds-only menu — selecting a kind inserts the slash token
 * back as a marker; the actual chip-resolution + record lookup is wired
 * incrementally in Block 16 (when the same picker components land for
 * task detail). The cross-record search in the prototype is on the
 * deferred list — the API and capture endpoint accept the structured
 * fields when a future revision plumbs them through.
 *
 * Keyboard: Esc closes; Enter (when menu closed) saves; ↑↓/Tab/Enter
 * pick from the open menu.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCapture } from '../api/inbox';
import styles from './QuickCapture.module.css';

interface SlashKind {
  id: string;
  label: string;
  hint: string;
}

const SLASH_KINDS: SlashKind[] = [
  { id: 'status', label: 'Status', hint: 'next, scheduled, waiting…' },
  { id: 'priority', label: 'Priority', hint: 'critical, important, routine, low' },
  { id: 'due', label: 'Due', hint: 'today, fri, 23 may' },
  { id: 'scheduled', label: 'Scheduled', hint: 'today, mon, next week' },
  { id: 'person', label: 'Person', hint: 'who is this for' },
  { id: 'project', label: 'Project', hint: 'attach to a project' },
  { id: 'area', label: 'Area', hint: 'attach to an area' },
  { id: 'context', label: 'Context', hint: 'work, personal…' },
];

export interface QuickCaptureProps {
  open: boolean;
  onClose: () => void;
}

export function QuickCapture({ open, onClose }: QuickCaptureProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [menu, setMenu] = useState<{ query: string; slashAt: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const capture = useCapture();

  // Reset on open / close. We only depend on `open` — the `capture` object
  // returned by useMutation is a fresh reference on every render, so listing
  // it here would loop the effect indefinitely (setState → re-render → new
  // capture object → effect re-runs). Its `.reset()` method is stable enough
  // to call from inside.
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setMenu(null);
      setActiveIdx(0);
      capture.reset();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredKinds = useMemo(() => {
    if (!menu) return [];
    const q = menu.query.toLowerCase();
    if (!q) return SLASH_KINDS;
    return SLASH_KINDS.filter((k) => k.label.toLowerCase().includes(q) || k.id.startsWith(q));
  }, [menu]);

  useEffect(() => {
    setActiveIdx(0);
  }, [menu?.query]);

  if (!open) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setTitle(value);

    const upToCaret = value.slice(0, caret);
    const slashAt = upToCaret.lastIndexOf('/');
    if (slashAt >= 0) {
      const after = upToCaret.slice(slashAt + 1);
      if (!/\s/.test(after)) {
        setMenu({ query: after, slashAt });
        return;
      }
    }
    setMenu(null);
  };

  const pickKind = (kind: SlashKind) => {
    if (!menu) return;
    // Replace the `/<query>` token with `/<kind>:` and reposition caret.
    const before = title.slice(0, menu.slashAt);
    const rest = title.slice(menu.slashAt);
    const tokenEnd = rest.search(/\s/);
    const after = tokenEnd === -1 ? '' : rest.slice(tokenEnd);
    const replacement = `/${kind.id}:`;
    const newText = before + replacement + after;
    setTitle(newText);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = (before + replacement).length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
    setMenu(null);
  };

  const submit = () => {
    if (!title.trim() || capture.isPending) return;
    capture.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        sourceKind: 'manual',
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (menu && filteredKinds.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filteredKinds.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filteredKinds.length) % filteredKinds.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const pick = filteredKinds[activeIdx];
        if (pick) pickKind(pick);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(null);
        return;
      }
    } else {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
        return;
      }
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Quick capture">
        <div className={styles.head}>
          <span className={styles.headLabel}>Quick capture</span>
          <span className={styles.headHint}>
            Type to add an inbox item · <span className={styles.kbd}>/</span> for fields
          </span>
        </div>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="What needs to happen?"
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
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />

        {menu && filteredKinds.length > 0 && (
          <div className={styles.menu} role="listbox">
            {filteredKinds.map((kind, i) => (
              <button
                key={kind.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={`${styles.menuItem} ${i === activeIdx ? styles.menuItemActive : ''}`}
                onClick={() => pickKind(kind)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className={styles.menuKey}>/</span>
                <span className={styles.menuLabel}>{kind.label}</span>
                <span className={styles.menuSub}>{kind.hint}</span>
              </button>
            ))}
          </div>
        )}

        {capture.isError && (
          <div className={styles.error}>
            Couldn’t save. {(capture.error as Error)?.message ?? 'Please try again.'}
          </div>
        )}

        <div className={styles.footer}>
          <span>
            <span className={styles.kbd}>↵</span> save · <span className={styles.kbd}>Esc</span> close
          </span>
          <span>
            <span className={styles.kbd}>⌘↵</span> save from notes
          </span>
        </div>
      </div>
    </div>
  );
}
