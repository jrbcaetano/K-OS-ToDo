import { createFileRoute } from '@tanstack/react-router';
import { TodayScreen } from '../screens/Today';

export const Route = createFileRoute('/')({
  component: TodayScreen,
});
