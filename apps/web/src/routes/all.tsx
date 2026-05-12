import { createFileRoute } from '@tanstack/react-router';
import { AllTasksScreen } from '../screens/AllTasks';

export const Route = createFileRoute('/all')({
  component: AllTasksScreen,
});
