import { useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import styles from '../components/AuthScreen.module.css';

export const Route = createFileRoute('/login')({
  component: LoginScreen,
});

function LoginScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Invalidate the cached session probe so the gate re-fetches with the
      // new cookie, then send the user to Today.
      await qc.invalidateQueries({ queryKey: ['session'] });
      await navigate({ to: '/' });
    } catch (err) {
      const errCode =
        err instanceof ApiError && err.body && typeof err.body === 'object' && 'error' in err.body
          ? (err.body as { error: string }).error
          : null;
      if (err instanceof ApiError && err.status === 403 && errCode === 'account_pending_approval') {
        setError(
          'Your account is awaiting approval. We’ll let you in once a platform admin reviews it.',
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setError('That email and password don’t match.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Try again in a few minutes.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>K-OS</span>
          <span className={styles.brandTagline}>Personal Operating System</span>
        </div>

        <div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your workspace.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            minLength={1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className={styles.alt}>
          No account yet? <Link to="/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}
