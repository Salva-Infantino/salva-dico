import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryHero } from './EntryHero.tsx';
import { TranslationList } from './TranslationList.tsx';

/** Wide screens: the selected entry next to the dictionary table. */
export function EntryPreview({
  entry,
  lang,
  onDeleted,
}: {
  entry: Entry;
  lang: Lang;
  onDeleted: () => void;
}) {
  const actions = useEntryActions();
  const notify = useNotify();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="preview">
      <EntryHero entry={entry} lang={lang} heading="h2" compact />
      {LANGS.filter((other) => other !== lang).map((other) => (
        <section key={other} className="preview-lang" aria-labelledby={`preview-${other}`}>
          <h3 id={`preview-${other}`} className="lang-card-title">
            <LangBadge lang={other} decorative />
            {fr.langs[other]}
          </h3>
          <TranslationList entry={entry} lang={other} />
        </section>
      ))}
      <div className="preview-actions">
        <button
          type="button"
          className="round-button danger-soft"
          aria-label={fr.entry.delete}
          title={fr.entry.delete}
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          <Icon name="trash" />
        </button>
        <Link className="button primary" to={`/entries/${entry.id}/edit`}>
          <Icon name="edit" />
          {fr.entry.edit}
        </Link>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={fr.entry.deleteTitle}
        confirmLabel={fr.entry.delete}
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          actions.remove(entry.id);
          notify(fr.notifications.deleted);
          onDeleted();
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      >
        <p>{fr.entry.deleteText}</p>
      </ConfirmDialog>
    </div>
  );
}
