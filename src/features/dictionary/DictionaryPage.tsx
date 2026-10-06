import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { Brand } from '../../components/AppShell.tsx';
import { Icon } from '../../components/Icon.tsx';
import { useAuth } from '../../auth/AuthContext.ts';
import { userInitial } from '../../auth/userInitial.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import type { Entry } from '../../domain/schemas.ts';
import { buildSearchIndex, searchEntries } from '../../domain/search.ts';
import { sortAlphabetically } from '../../domain/sort.ts';
import { useMediaQuery, WIDE_SCREEN } from '../../hooks/useMediaQuery.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryPreview } from '../entry/EntryPreview.tsx';
import { EntryList } from './EntryList.tsx';
import { LangChoice, TypeChoice } from './FilterChips.tsx';
import { filtersToParams } from './searchParams.ts';
import { useDictionaryFilters } from './useDictionaryFilters.ts';

export function DictionaryPage() {
  const state = useEntries();
  const { state: auth } = useAuth();
  const wide = useMediaQuery(WIDE_SCREEN);
  const [filters, updateFilters] = useDictionaryFilters();
  // Typing stays responsive: the list re-renders with the deferred value.
  const deferredFilters = useDeferredValue(filters);
  const search = useRef<HTMLInputElement>(null);

  const entries = state.status === 'ready' ? state.entries : null;
  const index = useMemo(
    () =>
      entries
        ? buildSearchIndex(
            sortAlphabetically(
              entries.filter((e) => !e.deleted),
              filters.lang,
            ),
          )
        : [],
    [entries, filters.lang],
  );
  const results = useMemo(
    () =>
      searchEntries(index, {
        query: deferredFilters.query,
        types: deferredFilters.type ? [deferredFilters.type] : [],
      }),
    [index, deferredFilters.query, deferredFilters.type],
  );
  const query = filters.query.trim();
  const selected = wide
    ? index.find((item) => item.entry.id === filters.selected)?.entry
    : undefined;

  // Wide screens: "/" jumps to the search field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const newEntryUrl = (text?: string) => {
    const params = new URLSearchParams({ lang: filters.lang });
    if (text) params.set('text', text);
    return `/entries/new?${params.toString()}`;
  };
  // Phones open the entry page; wide screens preview it next to the table.
  const linkTo = (entry: Entry) =>
    wide
      ? `/?${filtersToParams({ ...filters, selected: entry.id }).toString()}`
      : `/entries/${entry.id}?lang=${filters.lang}`;

  const count =
    index.length === 0
      ? fr.home.empty
      : query !== '' || filters.type
        ? fr.home.resultCount(results.length)
        : fr.home.entryCount(index.length);

  return (
    <main className={`page dictionary${wide ? ' wide' : ''}`}>
      <div className="mobile-top">
        <Brand />
        {auth.status === 'signedIn' && (
          <Link to="/settings" className="avatar" aria-label={fr.nav.account}>
            {userInitial(auth.user)}
          </Link>
        )}
      </div>

      <div className="title-row">
        <h1 className="display-title">{fr.home.title}</h1>
        <p className="muted result-count" aria-live="polite">
          {count}
        </p>
      </div>

      <div className="dictionary-filters">
        <label className="search-field">
          <Icon name="search" />
          <input
            ref={search}
            type="search"
            aria-label={fr.home.searchLabel}
            placeholder={fr.home.searchPlaceholder}
            value={filters.query}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => {
              updateFilters({ query: event.target.value }, { replace: true });
            }}
          />
          <kbd className="search-key" title={fr.home.searchShortcut}>
            /
          </kbd>
        </label>
        <TypeChoice
          value={filters.type}
          onChange={(type) => {
            updateFilters({ type }, { replace: true });
          }}
        />
        <div className="lang-row">
          <LangChoice
            value={filters.lang}
            onChange={(lang) => {
              updateFilters({ lang }, { replace: true });
            }}
          />
          <p className="muted shown-in" aria-hidden="true">
            {fr.home.shownIn(filters.lang.toUpperCase())}
          </p>
        </div>
      </div>

      {state.status === 'ready' && state.syncFailed && (
        <p role="status" className="error">
          {fr.sync.failed}
        </p>
      )}

      {results.length === 0 && (
        <div className="no-results">
          {index.length > 0 && <p>{fr.home.noResults}</p>}
          {query !== '' && (
            <Link className="button primary" to={newEntryUrl(query)}>
              {fr.home.addQuery(query)}
            </Link>
          )}
        </div>
      )}

      <div className="dictionary-body">
        {results.length > 0 && (
          <EntryList
            key={`${wide ? 'table' : 'cards'}-${deferredFilters.query}-${deferredFilters.type ?? ''}-${filters.lang}`}
            entries={results}
            lang={filters.lang}
            layout={wide ? 'table' : 'cards'}
            linkTo={linkTo}
            selectedId={selected?.id ?? null}
            sections={query === ''}
            onLangChange={(lang) => {
              updateFilters({ lang }, { replace: true });
            }}
          />
        )}
        {wide && index.length > 0 && (
          <aside className="preview-panel" aria-label={fr.home.preview}>
            {selected ? (
              <EntryPreview
                key={selected.id}
                entry={selected}
                lang={filters.lang}
                onDeleted={() => {
                  updateFilters({ selected: null }, { replace: true });
                }}
              />
            ) : (
              <p className="muted">{fr.home.noSelection}</p>
            )}
          </aside>
        )}
      </div>

      <Link className="fab" to={newEntryUrl()} aria-label={fr.home.add} title={fr.home.add}>
        <Icon name="plus" />
      </Link>
    </main>
  );
}
