import { Route, Routes } from 'react-router';
import { AccessDeniedPage } from './auth/AccessDeniedPage.tsx';
import { useAuth, type SignedInUser } from './auth/AuthContext.ts';
import { SignInPage } from './auth/SignInPage.tsx';
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { useEntries } from './data/EntriesContext.ts';
import { EntriesProvider } from './data/EntriesProvider.tsx';
import { DictionaryPage } from './features/dictionary/DictionaryPage.tsx';
import { EntryDetailPage } from './features/entry/EntryDetailPage.tsx';
import { LoadingScreen } from './pages/LoadingScreen.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export function App() {
  return (
    <>
      <AuthGate />
      <UpdatePrompt />
    </>
  );
}

function AuthGate() {
  const { state } = useAuth();
  switch (state.status) {
    case 'loading':
      return <LoadingScreen />;
    case 'signedOut':
      return <SignInPage />;
    case 'signedIn':
      return (
        <EntriesProvider uid={state.user.uid}>
          <SignedInApp user={state.user} />
        </EntriesProvider>
      );
  }
}

function SignedInApp({ user }: { user: SignedInUser }) {
  const entries = useEntries();
  if (entries.status === 'loading') return <LoadingScreen />;
  if (entries.status === 'denied') return <AccessDeniedPage uid={user.uid} email={user.email} />;

  return (
    <Routes>
      <Route path="/" element={<DictionaryPage />} />
      <Route path="/entries/:id" element={<EntryDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
