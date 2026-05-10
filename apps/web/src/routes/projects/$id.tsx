import { createFileRoute } from '@tanstack/react-router';
import { ProjectDetail } from '../../screens/ProjectDetail';

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetail,
});
