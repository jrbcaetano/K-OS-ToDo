import { createFileRoute } from '@tanstack/react-router';
import { ProfileSettingsPage } from '../../screens/settings/ProfileSettings';

export const Route = createFileRoute('/settings/profile')({
  component: ProfileSettingsPage,
});
