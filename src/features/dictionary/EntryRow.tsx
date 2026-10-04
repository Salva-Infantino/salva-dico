import { memo } from 'react';
import { Link } from 'react-router';
import { Flag } from '../../components/Flag.tsx';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';

/** One compact row: the entry in the 4 languages, each with its flag. */
export const EntryRow = memo(function EntryRow({ entry }: { entry: Entry }) {
  return (
    <li>
      <Link className="entry-row" to={`/entries/${entry.id}`}>
        {LANGS.map((lang) => (
          <span key={lang} className="entry-cell">
            <Flag lang={lang} />
            <span className="entry-cell-text">
              <RowText entry={entry} lang={lang} />
            </span>
          </span>
        ))}
      </Link>
    </li>
  );
});

/** Headwords of one language; noun articles are shown discreetly. */
function RowText({ entry, lang }: { entry: Entry; lang: Lang }) {
  const parts = rowParts(entry, lang);
  return parts.map(({ article, word }, index) => (
    <span key={index}>
      {index > 0 && ', '}
      {article && (
        <span className="grammar">{article.endsWith("'") ? article : `${article} `}</span>
      )}
      {word}
    </span>
  ));
}

function rowParts(entry: Entry, lang: Lang): { article?: string; word: string }[] {
  switch (entry.type) {
    case 'noun':
      return entry.translations[lang].map((t) =>
        'article' in t ? { article: t.article, word: t.text } : { word: t.text },
      );
    case 'adjective':
      return entry.translations[lang].map((t) => ({ word: 'text' in t ? t.text : t.mascSing }));
    case 'verb':
    case 'expression':
      return entry.translations[lang].map((t) => ({ word: t.text }));
  }
}
