import styles from './Approvals.module.css';

export function TodosSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>K-OS ToDos Settings</h1>
        <p className={styles.sub}>
          Workspace-level settings for the ToDos module. Nothing here yet —
          this page will fill in as more configuration arrives.
        </p>
      </header>
      <div className={styles.empty}>Coming soon.</div>
    </div>
  );
}
