import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <main style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em' }}>K-OS</h1>
      <p style={{ color: 'var(--ink-3)', marginTop: '8px' }}>
        Scaffolding in place. Today view will land here once components are ported from the
        Project North Star design.
      </p>
      <p style={{ color: 'var(--ink-3)', marginTop: '16px', fontSize: '12px' }}>
        See <code>docs/architecture.md</code>, <code>docs/schema.md</code>, and{' '}
        <code>K-OS Vault/Decisions/</code> for the design and decisions backing this app.
      </p>
    </main>
  );
}
