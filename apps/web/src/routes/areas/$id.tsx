import { createFileRoute } from '@tanstack/react-router';
import { AreaDetail } from '../../screens/AreaDetail';

export const Route = createFileRoute('/areas/$id')({
  component: AreaDetail,
});
