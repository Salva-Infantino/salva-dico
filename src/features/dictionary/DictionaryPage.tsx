import { useDeferredValue, useMemo } from 'react';
import { useEntries } from '../../data/EntriesContext.ts';
import { buildSearchIndex, searchEntries } from '../../domain/search.ts';
import { sortAlphabetically } from '../../domain/sort.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryList } from './EntryList.tsx';
import { LangChips, TypeChips } from './FilterChips.tsx';
import { filtersToParams } from './searchParams.ts';
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
          onChange={(langs) => {
            updateFilters({ langs }, { replace: true });
          }}
        />
        <TypeChips
          selected={filters.types}
          onChange={(types) => {
            updateFilters({ types }, { replace: true });
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

      {index.length > 0 && results.length === 0 && <p>{fr.home.noResults}</p>}
      <EntryList key={filtersToParams(deferredFilters).toString()} entries={results} />
    </main>
  );
}
