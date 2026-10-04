import { fr } from '../i18n/fr.ts';

export function LoadingScreen() {
  return (
    <main className="page page-centered" aria-busy="true">
      <p className="muted">{fr.common.loading}</p>
    </main>
  );
}
