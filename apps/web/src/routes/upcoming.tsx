import { createFileRoute } from '@tanstack/react-router';
import { UpcomingScreen } from '../screens/Upcoming';

export const Route = createFileRoute('/upcoming')({
  component: UpcomingScreen,
});
