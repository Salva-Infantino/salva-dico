import { useRouteError } from 'react-router';
import { BrandMark } from '../components/AppShell.tsx';
import { fr } from '../i18n/fr.ts';

/** Shown instead of a blank screen when a page crashes. Data is safe in the local cache. */
export function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  return (
    <main className="page page-centered welcome" role="alert">
      <BrandMark />
      <h1 className="display-title">{fr.errors.title}</h1>
      <p className="muted">{fr.errors.text}</p>
      <button
        type="button"
        onClick={() => {
          window.location.assign('/');
        }}
      >
        {fr.errors.reload}
      </button>
    </main>
  );
}
