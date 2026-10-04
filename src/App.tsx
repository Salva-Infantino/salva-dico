import { Outlet } from 'react-router';
import { AccessDeniedPage } from './auth/AccessDeniedPage.tsx';
import { useAuth, type SignedInUser } from './auth/AuthContext.ts';
import { SignInPage } from './auth/SignInPage.tsx';
import { NotificationsProvider } from './components/notifications/NotificationsProvider.tsx';
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { useEntries } from './data/EntriesContext.ts';
import { EntriesProvider } from './data/EntriesProvider.tsx';
import { EntryActionsProvider } from './data/EntryActionsProvider.tsx';
import { TranslatorProvider } from './data/TranslatorProvider.tsx';
import { LoadingScreen } from './pages/LoadingScreen.tsx';

/** Root layout of the data router: auth gate, initial sync, then the current page. */
export function App() {
  return (
    <NotificationsProvider>
      <AuthGate />
      <UpdatePrompt />
    </NotificationsProvider>
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
          <EntryActionsProvider uid={state.user.uid}>
            <TranslatorProvider>
              <SignedInApp user={state.user} />
            </TranslatorProvider>
          </EntryActionsProvider>
        </EntriesProvider>
      );
  }
}

function SignedInApp({ user }: { user: SignedInUser }) {
  const entries = useEntries();
  if (entries.status === 'loading') return <LoadingScreen />;
  if (entries.status === 'denied') return <AccessDeniedPage uid={user.uid} email={user.email} />;

  return <Outlet />;
}
