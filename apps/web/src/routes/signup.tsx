import { useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signup } from '../api/auth';
import { ApiError } from '../api/client';
import styles from '../components/AuthScreen.module.css';

export const Route = createFileRoute('/signup')({
  component: SignupScreen,
});

const MIN_PASSWORD_LENGTH = 8;

function SignupScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      if (result.user.approvalStatus && result.user.approvalStatus !== 'approved') {
        // Pending users don't get a session — show a confirmation panel
        // and stay on the signup screen.
        setPending(true);
        return;
      }
      await qc.invalidateQueries({ queryKey: ['session'] });
      await navigate({ to: '/' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('That email is already in use. Try signing in instead.');
        } else if (err.status === 400) {
          const body = err.body as { error?: string } | null;
          setError(
            body?.error === 'password_too_short'
              ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
              : 'Please check your details and try again.',
          );
        } else if (err.status === 429) {
          setError('Too many attempts. Try again in a few minutes.');
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (pending) {
    return (
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>K-OS</span>
            <span className={styles.brandTagline}>Personal Operating System</span>
          </div>
          <div>
            <h1 className={styles.title}>Account created — pending review</h1>
            <p className={styles.subtitle}>
              Thanks for signing up. A platform admin needs to approve new
              accounts before they can sign in. We’ll let you know as soon as
              that happens; in the meantime there’s nothing more to do here.
            </p>
          </div>
          <div className={styles.alt}>
            Already approved? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>K-OS</span>
          <span className={styles.brandTagline}>Personal Operating System</span>
        </div>

        <div>
          <h1 className={styles.title}>Create your workspace</h1>
          <p className={styles.subtitle}>
            One account. One workspace. Everything in its place.
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">Your name</label>
          <input
            id="displayName"
            className={styles.input}
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Joao Cardoso"
          />
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
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Creating workspace…' : 'Create workspace'}
        </button>

        <div className={styles.alt}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
