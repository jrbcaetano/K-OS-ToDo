import { createFileRoute } from '@tanstack/react-router';
import { PersonDetailRoute } from '../../screens/People';

export const Route = createFileRoute('/people/$id')({
  component: PersonDetailRoute,
});
