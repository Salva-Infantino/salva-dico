import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { SignedInUser } from '../auth/AuthContext.ts';
import { userInitial } from '../auth/userInitial.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { fr } from '../i18n/fr.ts';
import { Icon, type IconName } from './Icon.tsx';

/** Pages reachable from the main navigation; the others are full-screen on phones. */
const TAB_PATHS = new Set(['/', '/quiz', '/settings']);

const NAV: { to: string; icon: IconName; label: string; short: string }[] = [
  { to: '/', icon: 'book', label: fr.nav.dictionary, short: fr.nav.dictionaryShort },
  { to: '/quiz', icon: 'cards', label: fr.nav.quiz, short: fr.nav.quiz },
  { to: '/settings', icon: 'settings', label: fr.nav.settings, short: fr.nav.settings },
];

/** Four dots, one per language color. */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      {fr.app.name}
    </span>
  );
}

/**
 * Layout of the signed-in app: a sidebar on wide screens, a floating tab bar at the
 * bottom of the top-level pages on phones. CSS picks one or the other.
 */
export function AppShell({ user, children }: { user: SignedInUser; children: ReactNode }) {
  const { pathname, search } = useLocation();
  const online = useOnlineStatus();
  const showTabs = TAB_PATHS.has(pathname);
  // A new entry starts in the language shown in the dictionary.
  const lang = pathname === '/' ? new URLSearchParams(search).get('lang') : null;

  return (
    <div className={`shell${showTabs ? ' has-tabs' : ''}`}>
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand">
          <Brand />
        </Link>
        <Link className="button primary sidebar-new" to={`/entries/new?lang=${lang ?? 'fr'}`}>
          <Icon name="plus" />
          {fr.nav.newEntry}
        </Link>
        <nav aria-label={fr.nav.label}>
          <ul className="sidebar-nav">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'}>
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Link to="/settings" className="sidebar-account" aria-label={fr.nav.account}>
          <span className="avatar" aria-hidden="true">
            {userInitial(user)}
          </span>
          <span>
            <strong>{user.name?.split(' ')[0] ?? user.email}</strong>
            <span className="muted">{online ? fr.nav.synced : fr.nav.offline}</span>
          </span>
        </Link>
      </aside>

      <div className="shell-main">{children}</div>

      {showTabs && (
        <nav className="tab-bar" aria-label={fr.nav.label}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <Icon name={item.icon} />
              {item.short}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
