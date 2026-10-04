import { useId } from 'react';
import type { Lang } from '../domain/languages.ts';
import { fr } from '../i18n/fr.ts';

/**
 * Bundled SVG flags: flag emojis do not render on Windows (they show "FR", "IT"…).
 * All flags render in the same 3:2 box. English uses the British flag.
 *
 * `decorative`: the language name is already written next to the flag, so the flag
 * is hidden from screen readers instead of being announced twice.
 */
export function Flag({ lang, decorative = false }: { lang: Lang; decorative?: boolean }) {
  const label = fr.langs[lang];
  return (
    <svg
      className="flag"
      viewBox="0 0 60 40"
      preserveAspectRatio="xMidYMid slice"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      {!decorative && <title>{label}</title>}
      <FlagShapes lang={lang} />
    </svg>
  );
}

function FlagShapes({ lang }: { lang: Lang }) {
  switch (lang) {
    case 'fr':
      return (
        <>
          <rect width="20" height="40" fill="#002654" />
          <rect x="20" width="20" height="40" fill="#ffffff" />
          <rect x="40" width="20" height="40" fill="#ce1126" />
        </>
      );
    case 'it':
      return (
        <>
          <rect width="20" height="40" fill="#009246" />
          <rect x="20" width="20" height="40" fill="#ffffff" />
          <rect x="40" width="20" height="40" fill="#ce2b37" />
        </>
      );
    case 'es':
      return (
        <>
          <rect width="60" height="40" fill="#aa151b" />
          <rect y="10" width="60" height="20" fill="#f1bf00" />
        </>
      );
    case 'en':
      return <UnionJack />;
  }
}

/** Union Jack (1:2), centered in the 3:2 box; ids are unique per instance. */
function UnionJack() {
  const id = useId();
  const diagonalsClip = `${id}-diagonals`;
  return (
    <svg x="-10" width="80" height="40" viewBox="0 0 60 30">
      <clipPath id={diagonalsClip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath={`url(#${diagonalsClip})`}
        stroke="#c8102e"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
