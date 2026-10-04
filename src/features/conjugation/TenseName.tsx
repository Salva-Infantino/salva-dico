import type { TenseInfo } from '../../domain/conjugation.ts';
import type { Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';

/** Native tense name, with its French equivalent shown discreetly (not for French itself). */
export function TenseName({ lang, tense }: { lang: Lang; tense: TenseInfo }) {
  return (
    <>
      {tense.name}
      {lang !== 'fr' && <span className="grammar"> · {fr.tenses[tense.french]}</span>}
    </>
  );
}
