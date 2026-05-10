import { createFileRoute } from '@tanstack/react-router';
import { ReviewScreen } from '../screens/Review';

export const Route = createFileRoute('/review')({
  component: ReviewScreen,
});
