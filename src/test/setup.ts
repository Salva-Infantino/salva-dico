import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement modal dialogs yet.
if (typeof HTMLDialogElement !== 'undefined' && !('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
}

// jsdom does not implement pointer capture (used by the quiz swipe).
if (typeof Element !== 'undefined' && !('setPointerCapture' in Element.prototype)) {
  Object.assign(Element.prototype, {
    setPointerCapture() {
      // no-op
    },
    releasePointerCapture() {
      // no-op
    },
  });
}

afterEach(() => {
  cleanup();
});
