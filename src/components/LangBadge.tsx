import type { Lang } from '../domain/languages.ts';
import { fr } from '../i18n/fr.ts';

/**
 * Language code in a pill tinted with the language's color (FR, EN, ES, IT).
 *
 * `decorative`: the language name is already written next to the badge, so the badge
 * is hidden from screen readers instead of being announced twice. Otherwise screen
 * readers get the full name ("Anglais") rather than the code.
 */
export function LangBadge({ lang, decorative = false }: { lang: Lang; decorative?: boolean }) {
  return (
    <span className={`lang-badge lang-${lang}`} {...(decorative && { 'aria-hidden': true })}>
      <span aria-hidden="true">{lang.toUpperCase()}</span>
      {!decorative && <span className="visually-hidden">{fr.langs[lang]}</span>}
    </span>
  );
}
