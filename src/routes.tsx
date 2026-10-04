import type { RouteObject } from 'react-router';
import { App } from './App.tsx';
import { ConjugationPage } from './features/conjugation/ConjugationPage.tsx';
import { DictionaryPage } from './features/dictionary/DictionaryPage.tsx';
import { EntryEditorPage } from './features/editor/EntryEditorPage.tsx';
import { EntryDetailPage } from './features/entry/EntryDetailPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

/** Pages rendered once the user is signed in and entries are loaded. */
export const pageRoutes: RouteObject[] = [
  { index: true, element: <DictionaryPage /> },
  { path: 'entries/new', element: <EntryEditorPage /> },
  { path: 'entries/:id', element: <EntryDetailPage /> },
  { path: 'entries/:id/edit', element: <EntryEditorPage /> },
  { path: 'entries/:id/conjugation/:lang/:index', element: <ConjugationPage /> },
  { path: '*', element: <NotFoundPage /> },
];

/** Data router routes: `App` gates the pages behind auth and the initial sync. */
export const routes: RouteObject[] = [
  { element: <App />, errorElement: <ErrorPage />, children: pageRoutes },
];
