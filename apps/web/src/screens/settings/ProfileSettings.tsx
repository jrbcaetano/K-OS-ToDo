import { useSession } from '../../api/auth-hooks';
import styles from './Approvals.module.css';

export function ProfileSettingsPage() {
  const session = useSession();
  const user = session.data?.user;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile Settings</h1>
        <p className={styles.sub}>
          Account-level preferences. Display name + email come from your
          signup — full editing arrives in a later block.
        </p>
      </header>
      {user && (
        <div className={styles.empty}>
          Signed in as <strong>{user.displayName}</strong> · {user.email}
        </div>
      )}
    </div>
  );
}
