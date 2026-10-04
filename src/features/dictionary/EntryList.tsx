import { useEffect, useRef, useState } from 'react';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { EntryRow } from './EntryRow.tsx';

const PAGE_SIZE = 100;

/**
 * Renders rows progressively: the first page, then more when the end of the list
 * comes into view (or on button press). Keeps typing fluid with thousands of entries
 * without a virtualization library. Remount it (key) to restart from the first page.
 */
export function EntryList({ entries }: { entries: readonly Entry[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const remaining = entries.length - visible;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || remaining <= 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible((count) => count + PAGE_SIZE);
      },
      { rootMargin: '600px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [remaining]);

  return (
    <>
      <ul className="entry-list">
        {entries.slice(0, visible).map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </ul>
      {remaining > 0 && (
        <div ref={sentinel} className="list-more">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setVisible((count) => count + PAGE_SIZE);
            }}
          >
            {fr.home.showMore(remaining)}
          </button>
        </div>
      )}
    </>
  );
}
