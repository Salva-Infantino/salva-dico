import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { fr } from '../i18n/fr.ts';

/**
 * After each client-side navigation:
 * - the tab title names the page (WCAG 2.4.2), from its main heading;
 * - focus moves to that heading when it was lost with the link that was clicked, so
 *   screen readers announce the new page. A page that focused something itself
 *   (the editor focuses its first field) keeps that focus.
 */
export function RouteFocus() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    const title = heading?.textContent.trim();
    document.title = title && title !== fr.app.name ? `${title} · ${fr.app.name}` : fr.app.name;

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const focusLost = document.activeElement === null || document.activeElement === document.body;
    if (heading && focusLost) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}
