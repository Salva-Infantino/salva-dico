import { BrandMark } from '../components/AppShell.tsx';
import { LangBadge } from '../components/LangBadge.tsx';
import { LANGS } from '../domain/languages.ts';
import { fr } from '../i18n/fr.ts';
import { useAuth } from './AuthContext.ts';

export function SignInPage() {
  const { state, signIn, signInWithEmulatorOwner } = useAuth();
  const error = state.status === 'signedOut' ? state.error : null;

  return (
    <main className="page page-centered welcome">
      <BrandMark />
      <h1 className="display-title">{fr.app.name}</h1>
      <p className="welcome-langs" aria-hidden="true">
        {LANGS.map((lang) => (
          <LangBadge key={lang} lang={lang} decorative />
        ))}
      </p>
      <p className="muted">{fr.auth.intro}</p>
      <div className="welcome-actions">
        <button type="button" onClick={() => void signIn()}>
          {fr.auth.signIn}
        </button>
        {signInWithEmulatorOwner && (
          <button
            type="button"
            className="secondary"
            onClick={() => void signInWithEmulatorOwner()}
          >
            {fr.auth.signInEmulator}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error === 'offline' ? fr.auth.errorOffline : fr.auth.errorFailed}
        </p>
      )}
    </main>
  );
}
