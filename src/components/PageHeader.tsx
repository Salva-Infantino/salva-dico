import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon.tsx';

type Back = { label: string; to: string } | { label: string; onClick: () => void };

/** Page title, with a round back button on pages that are not in the main navigation. */
export function PageHeader({
  title,
  back,
  children,
}: {
  title: ReactNode;
  back?: Back;
  /** Extra content under the title (a hint, a badge…). */
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      {back &&
        ('to' in back ? (
          <Link to={back.to} className="round-button" aria-label={back.label} title={back.label}>
            <Icon name="back" />
          </Link>
        ) : (
          <button
            type="button"
            className="round-button"
            aria-label={back.label}
            title={back.label}
            onClick={back.onClick}
          >
            <Icon name="back" />
          </button>
        ))}
      <h1 className="display-title">{title}</h1>
      {children}
    </header>
  );
}
