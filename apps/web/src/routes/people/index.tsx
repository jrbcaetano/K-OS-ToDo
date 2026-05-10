import { createFileRoute } from '@tanstack/react-router';
import { PeopleScreen } from '../../screens/People';

export const Route = createFileRoute('/people/')({
  component: PeopleScreen,
});
