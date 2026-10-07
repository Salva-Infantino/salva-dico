import { memo } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { displayedHeadwords } from '../../domain/forms.ts';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';

export interface RowProps {
  entry: Entry;
  /** Language shown first. */
  lang: Lang;
  to: string;
  selected?: boolean;
}

const text = (entry: Entry, lang: Lang) => displayedHeadwords(entry, lang).join(', ');

function MasteredMark() {
  return (
    <span className="mastered-mark" role="img" aria-label={fr.home.mastered}>
      <Icon name="check" />
    </span>
  );
}

/** Phones: a card with the word in the shown language, then the 3 others as pills. */
export const EntryCard = memo(function EntryCard({ entry, lang, to }: RowProps) {
  return (
    <li>
      <Link className="entry-card" to={to}>
        <span className="entry-card-head">
          <span className="entry-card-word" lang={lang}>
            {text(entry, lang)}
          </span>
          {entry.type === 'verb' && <span className="type-badge">{fr.home.verbBadge}</span>}
          {entry.mastered && <MasteredMark />}
        </span>
        <span className="entry-card-pills">
          {LANGS.filter((other) => other !== lang).map((other) => (
            <span key={other} className={`lang-pill lang-${other}`}>
              <LangBadge lang={other} />
              <span lang={other}>{text(entry, other)}</span>
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
});

/** Wide screens: one table row, the 4 languages in fixed columns. */
export const EntryTableRow = memo(function EntryTableRow({ entry, lang, to, selected }: RowProps) {
  return (
    <tr className={selected ? 'selected' : undefined}>
      {LANGS.map((column) => (
        <td key={column} className={column === lang ? 'shown-lang' : undefined}>
          {column === lang ? (
            // One link per row, on the shown word, stretched over the whole row by CSS.
            <Link to={to} replace className="row-link" aria-current={selected ? 'true' : undefined}>
              <span lang={column}>{text(entry, column)}</span>
            </Link>
          ) : (
            <span lang={column}>{text(entry, column)}</span>
          )}
          {column === lang && entry.type === 'verb' && (
            <abbr className="type-badge small" title={fr.home.verbBadge}>
              {fr.home.verbBadgeShort}
            </abbr>
          )}
          {column === lang && entry.mastered && <MasteredMark />}
        </td>
      ))}
    </tr>
  );
});
