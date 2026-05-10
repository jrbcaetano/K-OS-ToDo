import { createFileRoute } from '@tanstack/react-router';
import { WaitingScreen } from '../screens/Waiting';

export const Route = createFileRoute('/waiting')({
  component: WaitingScreen,
});
