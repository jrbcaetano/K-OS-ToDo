import { createFileRoute } from '@tanstack/react-router';
import { ApprovalsPage } from '../../screens/settings/Approvals';

export const Route = createFileRoute('/settings/platform/approvals')({
  component: ApprovalsPage,
});
