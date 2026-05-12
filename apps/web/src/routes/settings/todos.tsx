import { createFileRoute } from '@tanstack/react-router';
import { TodosSettingsPage } from '../../screens/settings/TodosSettings';

export const Route = createFileRoute('/settings/todos')({
  component: TodosSettingsPage,
});
