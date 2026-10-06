import { useId, useState, type ChangeEvent } from 'react';
import { useAuth } from '../../auth/AuthContext.ts';
import { userInitial } from '../../auth/userInitial.ts';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import {
  buildExport,
  exportFileName,
  MAX_IMPORT_BYTES,
  previewImport,
  type ImportError,
  type ImportPreview,
} from '../../domain/backup.ts';
import { fr } from '../../i18n/fr.ts';
import { downloadJson } from './download.ts';

type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'error'; error: ImportError | 'too_large' | 'unreadable' }
  | { status: 'preview'; fileName: string; preview: ImportPreview };

export function SettingsPage() {
  const entriesState = useEntries();
  const actions = useEntryActions();
  const notify = useNotify();
  const { state: authState, signOut } = useAuth();
  const fileInputId = useId();
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' });
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const entries = entriesState.status === 'ready' ? entriesState.entries : [];
  const liveCount = entries.filter((entry) => !entry.deleted).length;

  const exportAll = () => {
    const now = new Date();
    downloadJson(exportFileName(now), buildExport(entries, now));
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Choosing the same file again must trigger a new change event.
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportState({ status: 'error', error: 'too_large' });
      return;
    }
    setImportState({ status: 'reading' });
    try {
      const result = previewImport(await file.text(), entries);
      setImportState(
        result.ok
          ? { status: 'preview', fileName: file.name, preview: result.preview }
          : { status: 'error', error: result.error },
      );
    } catch {
      setImportState({ status: 'error', error: 'unreadable' });
    }
  };

  const confirmImport = (preview: ImportPreview) => {
    actions.importEntries(preview.toImport);
    notify(fr.settings.imported(preview.toImport.length));
    setImportState({ status: 'idle' });
  };

  return (
    <main className="page settings">
      <PageHeader title={fr.settings.title} />

      <section className="settings-section" aria-labelledby="settings-backup">
        <h2 id="settings-backup" className="settings-title">
          <span className="settings-icon" aria-hidden="true">
            <Icon name="download" />
          </span>
          {fr.settings.backup}
        </h2>
        <p className="muted">{fr.settings.backupHint}</p>
        <div className="settings-actions">
          <button type="button" onClick={exportAll} disabled={liveCount === 0}>
            <Icon name="download" />
            {fr.settings.export(liveCount)}
          </button>
          {/* A label styled as a button keeps the native, accessible file picker. */}
          <label htmlFor={fileInputId} className="button secondary file-button">
            <Icon name="upload" />
            {fr.settings.import}
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void readFile(event)}
          />
        </div>

        <div aria-live="polite">
          {importState.status === 'reading' && <p className="muted">{fr.common.loading}</p>}
          {importState.status === 'error' && (
            <p role="alert" className="error">
              {fr.settings.importErrors[importState.error]}
            </p>
          )}
          {importState.status === 'preview' && (
            <div className="import-preview">
              <h3>{fr.settings.previewTitle(importState.fileName)}</h3>
              <ul>
                <li>{fr.settings.toImport(importState.preview.toImport.length)}</li>
                {importState.preview.alreadyPresent > 0 && (
                  <li>{fr.settings.alreadyPresent(importState.preview.alreadyPresent)}</li>
                )}
                {importState.preview.invalid > 0 && (
                  <li className="error">{fr.settings.invalid(importState.preview.invalid)}</li>
                )}
              </ul>
              <div className="settings-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setImportState({ status: 'idle' });
                  }}
                >
                  {fr.dialog.cancel}
                </button>
                {importState.preview.toImport.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      confirmImport(importState.preview);
                    }}
                  >
                    {fr.settings.confirmImport(importState.preview.toImport.length)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-account">
        <h2 id="settings-account" className="settings-title">
          <span className="settings-icon" aria-hidden="true">
            <Icon name="user" />
          </span>
          {fr.settings.account}
        </h2>
        {authState.status === 'signedIn' && (
          <div className="account-row">
            <span className="avatar" aria-hidden="true">
              {userInitial(authState.user)}
            </span>
            <span>
              {authState.user.name && <strong>{authState.user.name}</strong>}
              {authState.user.email && (
                <span className="muted">{fr.settings.signedInAs(authState.user.email)}</span>
              )}
            </span>
          </div>
        )}
        <button
          type="button"
          className="danger-outline"
          onClick={() => {
            setConfirmSignOut(true);
          }}
        >
          <Icon name="logout" />
          {fr.auth.signOut}
        </button>
      </section>

      <ConfirmDialog
        open={confirmSignOut}
        title={fr.settings.signOutTitle}
        confirmLabel={fr.auth.signOut}
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOut();
        }}
        onCancel={() => {
          setConfirmSignOut(false);
        }}
      >
        <p>{fr.settings.signOutText}</p>
      </ConfirmDialog>
    </main>
  );
}
