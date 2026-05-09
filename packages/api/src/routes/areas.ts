import { stubRouter } from './_stub';

export default stubRouter([
  { method: 'GET', path: '/' },
  { method: 'POST', path: '/' },
  { method: 'GET', path: '/:id' },
  { method: 'PATCH', path: '/:id' },
  { method: 'POST', path: '/:id/archive' },
  { method: 'POST', path: '/:id/restore' },
  { method: 'POST', path: '/:id/review' },
]);
