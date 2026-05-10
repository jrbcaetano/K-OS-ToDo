import { createFileRoute } from '@tanstack/react-router';
import { InboxScreen } from '../screens/Inbox';

export const Route = createFileRoute('/inbox')({
  component: InboxScreen,
});
