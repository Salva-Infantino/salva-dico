import { memo } from 'react';
import { Link } from 'react-router';
import { Flag } from '../../components/Flag.tsx';
import { headwords } from '../../domain/forms.ts';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';

/** One compact row: the entry in the 4 languages, each with its flag. */
export const EntryRow = memo(function EntryRow({ entry }: { entry: Entry }) {
  return (
    <li>
      <Link className="entry-row" to={`/entries/${entry.id}`}>
        {LANGS.map((lang) => (
          <span key={lang} className="entry-cell">
            <Flag lang={lang} />
            <span className="entry-cell-text">
              <RowText entry={entry} lang={lang} />
            </span>
          </span>
        ))}
      </Link>
    </li>
  );
});

/** Headwords of one language. */
function RowText({ entry, lang }: { entry: Entry; lang: Lang }) {
  return headwords(entry, lang).join(', ');
}
