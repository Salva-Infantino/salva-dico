import { useEffect, useId, useRef, type ReactNode } from 'react';
import { fr } from '../i18n/fr.ts';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as dangerous and focuses "cancel" first. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation built on the native <dialog>: focus trapping, Escape to
 * cancel and the inert background come from the browser.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = fr.dialog.cancel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      // The safe choice gets the focus first for destructive actions.
      (destructive ? cancelButton : confirmButton).current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open, destructive]);

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
      <div className="dialog-actions">
        <button ref={cancelButton} type="button" className="secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          ref={confirmButton}
          type="button"
          className={destructive ? 'danger' : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
