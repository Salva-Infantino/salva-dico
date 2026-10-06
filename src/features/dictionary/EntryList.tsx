import { Fragment, useEffect, useRef, useState } from 'react';
import { LangBadge } from '../../components/LangBadge.tsx';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { sectionLetter } from '../../domain/sort.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryCard, EntryTableRow } from './EntryRow.tsx';

const PAGE_SIZE = 100;

interface EntryListProps {
  entries: readonly Entry[];
  lang: Lang;
  /** Cards on phones, a table with a preview panel on wide screens. */
  layout: 'cards' | 'table';
  linkTo: (entry: Entry) => string;
  selectedId?: string | null;
  /** Alphabetical letter headers (only when the list is in alphabetical order). */
  sections: boolean;
  onLangChange: (lang: Lang) => void;
}

/**
 * Renders rows progressively: the first page, then more when the end of the list
 * comes into view (or on button press). Keeps typing fluid with thousands of entries
 * without a virtualization library. Remount it (key) to restart from the first page.
 */
export function EntryList({
  entries,
  lang,
  layout,
  linkTo,
  selectedId,
  sections,
  onLangChange,
}: EntryListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const remaining = entries.length - visible;
  const shown = entries.slice(0, visible);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || remaining <= 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible((count) => count + PAGE_SIZE);
      },
      { rootMargin: '600px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [remaining]);

  const more = remaining > 0 && (
    <div ref={sentinel} className="list-more">
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setVisible((count) => count + PAGE_SIZE);
        }}
      >
        {fr.home.showMore(remaining)}
      </button>
    </div>
  );

  if (layout === 'table') {
    return (
      <div className="entry-table-wrap">
        <table className="entry-table">
          <thead>
            <tr>
              {LANGS.map((column) => (
                <th key={column} scope="col" aria-sort={column === lang ? 'ascending' : undefined}>
                  <button
                    type="button"
                    className="column-sort"
                    title={fr.home.sortBy(fr.langs[column])}
                    onClick={() => {
                      onLangChange(column);
                    }}
                  >
                    <LangBadge lang={column} decorative />
                    {fr.langs[column]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
              <EntryTableRow
                key={entry.id}
                entry={entry}
                lang={lang}
                to={linkTo(entry)}
                selected={entry.id === selectedId}
              />
            ))}
          </tbody>
        </table>
        {more}
      </div>
    );
  }

  return (
    <>
      <ul className="entry-list">
        {shown.map((entry, index) => {
          const letter = sections ? sectionLetter(entry, lang) : null;
          const previous = index > 0 ? shown[index - 1] : undefined;
          const newSection =
            letter !== null && (previous === undefined || sectionLetter(previous, lang) !== letter);
          return (
            <Fragment key={entry.id}>
              {newSection && (
                <li className="section-letter" aria-hidden="true">
                  {letter}
                </li>
              )}
              <EntryCard entry={entry} lang={lang} to={linkTo(entry)} />
            </Fragment>
          );
        })}
      </ul>
      {more}
    </>
  );
}
