import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { EntriesContext } from '../data/EntriesContext.ts';
import type { Entry } from '../domain/schemas.ts';
import { DictionaryPage } from '../features/dictionary/DictionaryPage.tsx';
import { EntryDetailPage } from '../features/entry/EntryDetailPage.tsx';

/** Exposes the current URL to assertions. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

/** Renders the dictionary routes with the given entries already synced. */
export function renderWithEntries(entries: Entry[], path = '/') {
  return render(
    <EntriesContext value={{ status: 'ready', entries, syncFailed: false }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<DictionaryPage />} />
          <Route path="/entries/:id" element={<EntryDetailPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </EntriesContext>,
  );
}
