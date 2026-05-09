// Design tokens are exported as a CSS file:
//   import '@k-os/ui/tokens.css';

export { Icon, ICON_PATHS } from './components/Icon';
export type { IconName, IconProps } from './components/Icon';

export { Avatar } from './components/Avatar';
export type { AvatarProps, PersonLike } from './components/Avatar';

export { StatusChip } from './components/StatusChip';
export type { StatusChipProps, TaskStatus } from './components/StatusChip';

export { PriorityDot } from './components/PriorityDot';
export type { PriorityDotProps, TaskPriority } from './components/PriorityDot';

export { CtxBadge } from './components/CtxBadge';
export type { CtxBadgeProps } from './components/CtxBadge';

export { PersonChip } from './components/PersonChip';
export type { PersonChipProps } from './components/PersonChip';

export { DateChip } from './components/DateChip';
export type { DateChipProps, DateChipState } from './components/DateChip';

export { SectionHead } from './components/SectionHead';
export type { SectionHeadProps } from './components/SectionHead';

export { TaskRow } from './components/TaskRow';
export type { TaskRowProps, TaskRowModel } from './components/TaskRow';

export { TweaksPanel } from './components/TweaksPanel';

export { useTweaks, TWEAK_DEFAULTS } from './hooks/useTweaks';
export type { Tweaks, Theme, Density, Accent } from './hooks/useTweaks';

export { AppShell } from './layouts/AppShell';
export type { AppShellProps } from './layouts/AppShell';

export { Sidebar } from './layouts/Sidebar';
export type { SidebarProps, SidebarUser, SidebarItemRenderProps } from './layouts/Sidebar';
