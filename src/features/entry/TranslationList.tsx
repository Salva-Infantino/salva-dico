import { adjectiveForms, withArticle } from '../../domain/display.ts';
import type { Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';

/**
 * All translations of one language, with equal weight. The main word stands out;
 * grammar details (articles, gender, plural, other forms) are shown discreetly.
 */
export function TranslationList({ entry, lang }: { entry: Entry; lang: Lang }) {
  return <ul className="translation-list">{items(entry, lang)}</ul>;
}

function items(entry: Entry, lang: Lang) {
  switch (entry.type) {
    case 'expression':
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <span className="headword">{t.text}</span>
        </li>
      ));

    case 'noun':
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          {'article' in t ? (
            <>
              <span className="grammar">
                {t.article.endsWith("'") ? t.article : `${t.article} `}
              </span>
              <span className="headword">{t.text}</span>
              <Details
                parts={[
                  t.plural !== undefined && t.pluralArticle !== undefined
                    ? withArticle(t.pluralArticle, t.plural)
                    : null,
                  t.gender === 'm' ? fr.grammar.masculine : fr.grammar.feminine,
                ]}
              />
            </>
          ) : (
            <>
              <span className="headword">{t.text}</span>
              <Details parts={[t.plural ? `${fr.grammar.plural} ${t.plural}` : null]} />
            </>
          )}
        </li>
      ));

    case 'adjective':
      return entry.translations[lang].map((t, i) => {
        if ('text' in t) {
          return (
            <li key={i}>
              <span className="headword">{t.text}</span>
            </li>
          );
        }
        const [main, ...others] = adjectiveForms(t);
        return (
          <li key={i}>
            <span className="headword">{main}</span>
            <Details parts={others} />
          </li>
        );
      });

    case 'verb':
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <span className="headword">{t.text}</span>
          {'pastSimple' in t.conjugation && (
            <Details
              parts={[
                t.conjugation.pastSimple,
                t.conjugation.pastParticiple,
                t.conjugation.irregular ? fr.grammar.irregular : null,
              ]}
            />
          )}
        </li>
      ));
  }
}

function Details({ parts }: { parts: readonly (string | null)[] }) {
  const shown = parts.filter((part): part is string => part !== null);
  if (shown.length === 0) return null;
  return <span className="grammar details"> · {shown.join(' · ')}</span>;
}
