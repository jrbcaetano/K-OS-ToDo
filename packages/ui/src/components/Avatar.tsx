/**
 * Avatar — initials in a colored circle.
 *
 * The colour is provided by the caller (`color`) — derived from the Person
 * record in `@k-os/db`. Falls back to the gradient defined in the CSS
 * module if no colour is given.
 */

import styles from './Avatar.module.css';

export interface PersonLike {
  initials: string;
  color?: string | null;
}

export interface AvatarProps {
  person: PersonLike;
  size?: number;
}

export function Avatar({ person, size = 22 }: AvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };
  if (person.color) {
    style.background = person.color;
  }
  return (
    <span className={styles.avatar} style={style}>
      {person.initials}
    </span>
  );
}
