/**
 * PersonChip — small avatar + first name. Used inline in task rows and
 * detail screens.
 */

import { Avatar, type PersonLike } from './Avatar';
import styles from './PersonChip.module.css';

export interface PersonChipProps {
  person: PersonLike & { name: string };
}

export function PersonChip({ person }: PersonChipProps) {
  const firstName = person.name.split(' ')[0] ?? person.name;
  return (
    <span className={styles.chip}>
      <Avatar person={person} size={16} />
      {firstName}
    </span>
  );
}
