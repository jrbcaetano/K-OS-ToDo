import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '../../screens/Projects';

export const Route = createFileRoute('/projects/')({
  component: ProjectsScreen,
});
