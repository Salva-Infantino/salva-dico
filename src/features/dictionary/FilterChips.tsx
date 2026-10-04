import { Flag } from '../../components/Flag.tsx';
import { ENTRY_TYPES, LANGS, type EntryType, type Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';

export function LangChips({
  selected,
  onToggle,
}: {
  selected: readonly Lang[];
  onToggle: (lang: Lang) => void;
}) {
  return (
    <div className="chips" role="group" aria-label={fr.home.langFilter}>
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          className="chip"
          aria-pressed={selected.includes(lang)}
          onClick={() => {
            onToggle(lang);
          }}
        >
          <Flag lang={lang} />
          <span className="chip-label">{lang.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

export function TypeChips({
  selected,
  onToggle,
}: {
  selected: readonly EntryType[];
  onToggle: (type: EntryType) => void;
}) {
  return (
    <div className="chips" role="group" aria-label={fr.home.typeFilter}>
      {ENTRY_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className="chip"
          aria-pressed={selected.includes(type)}
          onClick={() => {
            onToggle(type);
          }}
        >
          {fr.entryTypes[type]}
        </button>
      ))}
    </div>
  );
}
