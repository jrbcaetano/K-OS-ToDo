import { createFileRoute } from '@tanstack/react-router';
import { AreasScreen } from '../../screens/Areas';

export const Route = createFileRoute('/areas/')({
  component: AreasScreen,
});
