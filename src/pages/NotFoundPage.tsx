import { Link } from 'react-router';
import { BrandMark } from '../components/AppShell.tsx';
import { fr } from '../i18n/fr.ts';

export function NotFoundPage() {
  return (
    <main className="page page-centered welcome">
      <BrandMark />
      <h1 className="display-title">{fr.notFound.title}</h1>
      <Link className="button" to="/">
        {fr.notFound.backHome}
      </Link>
    </main>
  );
}
