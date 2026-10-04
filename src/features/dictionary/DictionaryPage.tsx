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
