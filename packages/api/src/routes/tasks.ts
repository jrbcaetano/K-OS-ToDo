import { stubRouter } from './_stub';

export default stubRouter([
  { method: 'GET', path: '/' },
  { method: 'POST', path: '/' },
  { method: 'GET', path: '/today' },
  { method: 'GET', path: '/upcoming' },
  { method: 'GET', path: '/waiting' },
  { method: 'GET', path: '/:id' },
  { method: 'PATCH', path: '/:id' },
  { method: 'DELETE', path: '/:id' },
  { method: 'POST', path: '/:id/complete' },
  { method: 'POST', path: '/:id/archive' },
  { method: 'POST', path: '/:id/restore' },
  { method: 'GET', path: '/:id/events' },
]);
