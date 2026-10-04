import { Link } from 'react-router';
import { fr } from '../i18n/fr.ts';

export function NotFoundPage() {
  return (
    <main className="page">
      <h1>{fr.notFound.title}</h1>
      <Link to="/">{fr.notFound.backHome}</Link>
    </main>
  );
}
