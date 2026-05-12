/**
 * Platform > Registration Pending Approval.
 *
 * Shows every signup waiting for an admin decision. Approve flips the row
 * to `approved` and lets them log in; Reject soft-deletes the row but
 * keeps it for audit (the email is released for re-registration via the
 * partial unique index on users.email).
 */

import { useApprovals, useApprove, useReject, type PendingApproval } from '../../api/admin';
import styles from './Approvals.module.css';

export function ApprovalsPage() {
  const query = useApprovals();
  const approve = useApprove();
  const reject = useReject();

  const approvals = query.data?.approvals ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Registration Pending Approval</h1>
        <p className={styles.sub}>
          New signups land here. Approve to let them log in, or reject to drop
          their account. Rejected emails can be re-registered later.
        </p>
      </header>

      {query.isLoading && <div className={styles.empty}>Loading…</div>}
      {query.isError && (
        <div className={styles.empty}>
          Couldn’t load the approval queue. {(query.error as Error)?.message ?? ''}
        </div>
      )}

      {!query.isLoading && approvals.length === 0 && (
        <div className={styles.empty}>No registrations are waiting for approval.</div>
      )}

      {approvals.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th className={styles.actionsCell} />
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <Row
                key={a.id}
                row={a}
                onApprove={() => approve.mutate(a.id)}
                onReject={() => reject.mutate(a.id)}
                busy={approve.isPending || reject.isPending}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({
  row,
  onApprove,
  onReject,
  busy,
}: {
  row: PendingApproval;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const created = new Date(row.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <tr>
      <td className={styles.dateCell}>{created}</td>
      <td>{row.displayName}</td>
      <td className={styles.emailCell}>{row.email}</td>
      <td className={styles.actionsCell}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnApprove}`}
          onClick={onApprove}
          disabled={busy}
        >
          Approve
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnReject}`}
          onClick={onReject}
          disabled={busy}
        >
          Reject
        </button>
      </td>
    </tr>
  );
}
