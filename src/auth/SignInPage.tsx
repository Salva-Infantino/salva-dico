import { fr } from '../i18n/fr.ts';
import { useAuth } from './AuthContext.ts';

export function SignInPage() {
  const { state, signIn, signInWithEmulatorOwner } = useAuth();
  const error = state.status === 'signedOut' ? state.error : null;

  return (
    <main className="page page-centered">
      <h1>{fr.app.name}</h1>
      <p className="muted">{fr.auth.intro}</p>
      <button type="button" onClick={() => void signIn()}>
        {fr.auth.signIn}
      </button>
      {signInWithEmulatorOwner && (
        <button type="button" className="secondary" onClick={() => void signInWithEmulatorOwner()}>
          {fr.auth.signInEmulator}
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error === 'offline' ? fr.auth.errorOffline : fr.auth.errorFailed}
        </p>
      )}
    </main>
  );
}
