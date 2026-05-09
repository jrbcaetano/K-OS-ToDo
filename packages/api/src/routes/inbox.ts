import { stubRouter } from './_stub';

// Inbox is a /tasks?status=inbox query under the hood (Q9 — single tasks table),
// but the dedicated routes give the UI a clean surface for capture and triage.
export default stubRouter([
  { method: 'GET', path: '/' },
  { method: 'POST', path: '/capture' },
  { method: 'POST', path: '/:id/triage' },
  { method: 'POST', path: '/:id/discard' },
]);
