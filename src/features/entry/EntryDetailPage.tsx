import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Flag } from '../../components/Flag.tsx';
import { useEntries } from '../../data/EntriesContext.ts';
import { LANGS } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import { TranslationList } from './TranslationList.tsx';

export function EntryDetailPage() {
  const { id } = useParams();
  const state = useEntries();
  const navigate = useNavigate();
  const location = useLocation();
  const entry =
    state.status === 'ready'
      ? state.entries.find((candidate) => candidate.id === id && !candidate.deleted)
      : undefined;

  // Back to the previous search if we came from the dictionary, home otherwise.
  const goBack = () => {
    if (location.key === 'default') void navigate('/');
    else void navigate(-1);
  };

  if (!entry) {
    return (
      <main className="page">
        <h1>{fr.entry.notFound}</h1>
        <Link to="/">{fr.entry.back}</Link>
      </main>
    );
  }

  return (
    <main className="page entry-detail">
      <nav>
        <button type="button" className="link-button" onClick={goBack}>
          ← {fr.entry.back}
        </button>
      </nav>
      <h1 className="entry-title">
        {fr.entryTypes[entry.type]}
        {entry.mastered && <span className="badge">{fr.entry.mastered}</span>}
      </h1>
      <div className="lang-grid">
        {LANGS.map((lang) => (
          <section key={lang} className="lang-card" aria-labelledby={`lang-${lang}`}>
            <h2 id={`lang-${lang}`} className="lang-card-title">
              <Flag lang={lang} decorative />
              {fr.langs[lang]}
            </h2>
            <TranslationList entry={entry} lang={lang} />
          </section>
        ))}
      </div>
    </main>
  );
}
