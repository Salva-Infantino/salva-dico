import { BrandMark } from '../components/AppShell.tsx';
import { fr } from '../i18n/fr.ts';
import { useAuth } from './AuthContext.ts';

/** Shown when the Firestore rules refuse this account. The UID helps configure the owner. */
export function AccessDeniedPage({ uid, email }: { uid: string; email: string | null }) {
  const { signOut } = useAuth();

  return (
    <main className="page page-centered welcome">
      <BrandMark />
      <h1 className="display-title">{fr.auth.deniedTitle}</h1>
      <p>{fr.auth.deniedText}</p>
      {email && <p className="muted">{email}</p>}
      <p className="muted">
        {fr.auth.accountId}
        {fr.common.colon}
        <code className="selectable">{uid}</code>
      </p>
      <button type="button" className="secondary" onClick={() => void signOut()}>
        {fr.auth.signOut}
      </button>
    </main>
  );
}
