import { stubRouter } from './_stub';

export default stubRouter([
  { method: 'GET', path: '/' },
  { method: 'POST', path: '/' },
  { method: 'PATCH', path: '/:id' },
  { method: 'DELETE', path: '/:id' },
]);
