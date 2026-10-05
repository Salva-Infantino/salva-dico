import { useDeferredValue, useMemo } from 'react';
import { Link } from 'react-router';
import { useEntries } from '../../data/EntriesContext.ts';
import { buildSearchIndex, searchEntries } from '../../domain/search.ts';
import { sortAlphabetically } from '../../domain/sort.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryList } from './EntryList.tsx';
import { LangChips, TypeChips } from './FilterChips.tsx';
import { filtersToParams, toggle } from './searchParams.ts';
import { useDictionaryFilters } from './useDictionaryFilters.ts';

export function DictionaryPage() {
  const state = useEntries();
  const [filters, updateFilters] = useDictionaryFilters();
  // Typing stays responsive: the list re-renders with the deferred value.
  const deferredFilters = useDeferredValue(filters);

  const entries = state.status === 'ready' ? state.entries : null;
  const index = useMemo(
    () => (entries ? buildSearchIndex(sortAlphabetically(entries.filter((e) => !e.deleted))) : []),
    [entries],
  );
  const results = useMemo(() => searchEntries(index, deferredFilters), [index, deferredFilters]);
  // New entries start in the only selected language, French otherwise.
  const startLang = filters.langs.length === 1 ? filters.langs[0] : undefined;
  const newEntryUrl = (text?: string) => {
    const params = new URLSearchParams();
    params.set('lang', startLang ?? 'fr');
    if (text) params.set('text', text);
    return `/entries/new?${params.toString()}`;
  };
  const isFiltering =
    filters.query.trim() !== '' || filters.langs.length > 0 || filters.types.length > 0;

  return (
    <main className="page dictionary">
      <header className="search-header">
        <h1 className="visually-hidden">{fr.home.title}</h1>
        <div className="search-field">
          <input
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
          <Link className="button secondary quiz-link" to="/quiz">
            {fr.quiz.open}
          </Link>
          <Link
            className="button secondary icon-link"
            to="/settings"
            aria-label={fr.settings.open}
            title={fr.settings.open}
          >
            {/* Material Design "settings" icon (Apache License 2.0). */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
              />
            </svg>
          </Link>
        </div>
        <LangChips
          selected={filters.langs}
          onToggle={(lang) => {
            updateFilters((current) => ({ langs: toggle(current.langs, lang) }), { replace: true });
          }}
        />
        <TypeChips
          selected={filters.types}
          onToggle={(type) => {
            updateFilters((current) => ({ types: toggle(current.types, type) }), { replace: true });
          }}
        />
      </header>

      {state.status === 'ready' && state.syncFailed && (
        <p role="status" className="error">
          {fr.sync.failed}
        </p>
      )}

      <p className="muted result-count" aria-live="polite">
        {index.length === 0
          ? fr.home.empty
          : isFiltering
            ? fr.home.resultCount(results.length)
            : fr.home.entryCount(index.length)}
      </p>

      {results.length === 0 && (
        <div className="no-results">
          {index.length > 0 && <p>{fr.home.noResults}</p>}
          {filters.query.trim() !== '' && (
            <Link className="button" to={newEntryUrl(filters.query.trim())}>
              {fr.home.addQuery(filters.query.trim())}
            </Link>
          )}
        </div>
      )}
      <EntryList key={filtersToParams(deferredFilters).toString()} entries={results} />

      <Link className="fab" to={newEntryUrl()} aria-label={fr.home.add} title={fr.home.add}>
        <span aria-hidden="true">+</span>
      </Link>
    </main>
  );
}
