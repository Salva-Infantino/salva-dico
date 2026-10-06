import { Link, useParams } from 'react-router';
import { LangBadge } from '../../components/LangBadge.tsx';
import { useEntries } from '../../data/EntriesContext.ts';
import { IMPERATIVE, IMPERATIVE_LABELS, TENSES, withPronoun } from '../../domain/conjugation.ts';
import { isLang, type RomanceLang } from '../../domain/languages.ts';
import type {
  ConjugationEN,
  ConjugationES,
  ConjugationFR,
  ConjugationIT,
  Imperative,
} from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { TenseName } from './TenseName.tsx';

type RomanceConjugation = ConjugationFR | ConjugationES | ConjugationIT;

/** /entries/:id/conjugation/:lang/:index — every tense of one verb, in one language. */
export function ConjugationPage() {
  const { id, lang, index } = useParams();
  const state = useEntries();
  const entry =
    state.status === 'ready' ? state.entries.find((e) => e.id === id && !e.deleted) : undefined;
  const verb =
    entry?.type === 'verb' && isLang(lang) ? entry.translations[lang][Number(index)] : undefined;

  if (!entry || !verb || !isLang(lang)) {
    return (
      <main className="page">
        <h1>{fr.conjugation.notFound}</h1>
        <Link to={entry ? `/entries/${entry.id}` : '/'}>{fr.conjugation.back}</Link>
      </main>
    );
  }

  return (
    <main className="page conjugation">
      <nav>
        <Link to={`/entries/${entry.id}`}>← {fr.conjugation.back}</Link>
      </nav>
      <h1 className="conjugation-title">
        <LangBadge lang={lang} />
        <span lang={lang}>{verb.text}</span>
      </h1>
      {lang === 'en' ? (
        <EnglishForms conjugation={verb.conjugation as ConjugationEN} />
      ) : (
        <RomanceTenses lang={lang} conjugation={verb.conjugation as RomanceConjugation} />
      )}
    </main>
  );
}

function EnglishForms({ conjugation }: { conjugation: ConjugationEN }) {
  return (
    <dl className="english-forms" lang="en">
      <dt>{fr.conjugation.base}</dt>
      <dd>{conjugation.base}</dd>
      <dt>{fr.conjugation.pastSimple}</dt>
      <dd>{conjugation.pastSimple}</dd>
      <dt>{fr.conjugation.pastParticiple}</dt>
      <dd>
        {conjugation.pastParticiple}
        {conjugation.irregular && <span className="badge">{fr.grammar.irregular}</span>}
      </dd>
    </dl>
  );
}

function RomanceTenses({
  lang,
  conjugation,
}: {
  lang: RomanceLang;
  conjugation: RomanceConjugation;
}) {
  const forms = conjugation as unknown as Record<string, readonly string[]>;
  const imperative = (conjugation as unknown as Record<string, Imperative>)[IMPERATIVE[lang].key];
  return (
    <>
      {'auxiliary' in conjugation && (
        <p className="muted">
          {fr.conjugation.auxiliary} : <strong lang={lang}>{conjugation.auxiliary}</strong>
        </p>
      )}
      <div className="tense-grid" lang={lang}>
        {TENSES[lang].map((tense) => (
          <section key={tense.key} className="tense-card" aria-labelledby={`tense-${tense.key}`}>
            <h2 id={`tense-${tense.key}`}>
              <TenseName lang={lang} tense={tense} />
            </h2>
            <ul className="tense-forms">
              {(forms[tense.key] ?? []).map((form, person) => {
                const shown = withPronoun(lang, person, form);
                return (
                  <li key={person}>
                    <span className="grammar">{shown.pronoun}</span>
                    {shown.form}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {imperative && (
          <section className="tense-card" aria-labelledby="tense-imperative">
            <h2 id="tense-imperative">
              <TenseName lang={lang} tense={IMPERATIVE[lang]} />
            </h2>
            <table className="imperative-table">
              <thead>
                <tr>
                  <td />
                  <th scope="col">{fr.conjugation.affirmative}</th>
                  <th scope="col">{fr.conjugation.negative}</th>
                </tr>
              </thead>
              <tbody>
                {IMPERATIVE_LABELS[lang].map((pronoun, person) => (
                  <tr key={pronoun}>
                    <th scope="row" className="grammar">
                      ({pronoun})
                    </th>
                    <td>{imperative.affirmative[person]}</td>
                    <td>{imperative.negative[person]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
