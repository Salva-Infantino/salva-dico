import { Link } from 'react-router';
import { headwords } from '../../domain/forms.ts';
import type { Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';

/** One message per word, with a link to each existing entry that contains it. */
export function DuplicateWarning({
  word,
  lang,
  entries,
}: {
  word: string;
  lang: Lang;
  entries: readonly Entry[];
}) {
  if (entries.length === 0) return null;
  return (
    <div className="warning">
      <p>{fr.editor.duplicate(word.trim(), fr.langs[lang])}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link to={`/entries/${entry.id}`}>
              {fr.editor.openExisting(headwords(entry, 'fr').join(', '), fr.entryTypes[entry.type])}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
