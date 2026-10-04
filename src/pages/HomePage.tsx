import { fr } from '../i18n/fr.ts';

export function HomePage() {
  return (
    <main className="page">
      <h1>{fr.home.title}</h1>
      <p className="muted">{fr.home.empty}</p>
    </main>
  );
}
