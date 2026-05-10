import { createFileRoute } from '@tanstack/react-router';
import { TaskDetailScreen } from '../../screens/TaskDetail';

export const Route = createFileRoute('/tasks/$id')({
  component: TaskDetailScreen,
});
