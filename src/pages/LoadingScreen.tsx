import { BrandMark } from '../components/AppShell.tsx';
import { fr } from '../i18n/fr.ts';

export function LoadingScreen() {
  return (
    <main className="page page-centered welcome loading" aria-busy="true">
      <BrandMark />
      <p className="muted">{fr.common.loading}</p>
    </main>
  );
}
