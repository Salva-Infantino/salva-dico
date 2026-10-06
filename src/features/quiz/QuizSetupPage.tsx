import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { useEntries } from '../../data/EntriesContext.ts';
import { ENTRY_TYPES, LANGS } from '../../domain/languages.ts';
import {
  eligibleEntries,
  QUIZ_COUNTS,
  QUIZ_ORDERS,
  targetsForSource,
  type QuizSettings,
} from '../../domain/quiz.ts';
import { fr } from '../../i18n/fr.ts';
import { toggle } from '../dictionary/searchParams.ts';
import { loadQuizSettings, saveQuizSettings } from './quizSettingsStorage.ts';

/** What the session page receives through the navigation state. */
export interface QuizLocationState {
  settings: QuizSettings;
}

export function QuizSetupPage() {
  const state = useEntries();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadQuizSettings);
  const update = (patch: Partial<QuizSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const entries = state.status === 'ready' ? state.entries : [];
  const available = eligibleEntries(entries, settings).length;
  const cardCount = settings.count === 'all' ? available : Math.min(settings.count, available);
  const canStart = cardCount > 0 && settings.targets.length > 0 && settings.types.length > 0;

  const start = () => {
    saveQuizSettings(settings);
    void navigate('/quiz/session', { state: { settings } satisfies QuizLocationState });
  };

  return (
    <main className="page quiz-setup">
      <PageHeader title={fr.quiz.setupTitle} />

      <form
        className="quiz-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canStart) start();
        }}
      >
        <fieldset className="setup-card">
          <legend>{fr.quiz.source}</legend>
          <div className="choice-group">
            {LANGS.map((lang) => (
              <label key={lang} className={`chip-choice lang-${lang}`}>
                <input
                  type="radio"
                  name="quiz-source"
                  checked={settings.source === lang}
                  onChange={() => {
                    update({ source: lang, targets: targetsForSource(lang, settings.targets) });
                  }}
                />
                <LangBadge lang={lang} decorative />
                {fr.langs[lang]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-card">
          <legend>{fr.quiz.targets}</legend>
          <div className="choice-group">
            {LANGS.filter((lang) => lang !== settings.source).map((lang) => (
              <label key={lang} className={`chip-choice lang-${lang}`}>
                <input
                  type="checkbox"
                  checked={settings.targets.includes(lang)}
                  onChange={() => {
                    // Keep the canonical order whatever the click order.
                    const next = toggle(settings.targets, lang);
                    update({ targets: LANGS.filter((l) => next.includes(l)) });
                  }}
                />
                <LangBadge lang={lang} decorative />
                {fr.langs[lang]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-card">
          <legend>{fr.quiz.types}</legend>
          <div className="choice-group">
            {ENTRY_TYPES.map((type) => (
              <label key={type} className="chip-choice">
                <input
                  type="checkbox"
                  checked={settings.types.includes(type)}
                  onChange={() => {
                    const next = toggle(settings.types, type);
                    update({ types: ENTRY_TYPES.filter((t) => next.includes(t)) });
                  }}
                />
                {fr.entryTypes[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          role="switch"
          aria-checked={settings.excludeMastered}
          className="switch-row setup-card"
          onClick={() => {
            update({ excludeMastered: !settings.excludeMastered });
          }}
        >
          <span className="switch-text">
            <strong>{fr.quiz.excludeMastered}</strong>
          </span>
          <span className="switch-track" aria-hidden="true" />
        </button>

        <fieldset className="setup-card">
          <legend>{fr.quiz.order}</legend>
          <div className="choice-group">
            {QUIZ_ORDERS.map((order) => (
              <label key={order} className="chip-choice">
                <input
                  type="radio"
                  name="quiz-order"
                  checked={settings.order === order}
                  onChange={() => {
                    update({ order });
                  }}
                />
                {fr.quiz.orders[order]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-card">
          <legend>{fr.quiz.count}</legend>
          <div className="choice-group">
            {QUIZ_COUNTS.map((count) => (
              <label key={count} className="chip-choice">
                <input
                  type="radio"
                  name="quiz-count"
                  checked={settings.count === count}
                  onChange={() => {
                    update({ count });
                  }}
                />
                {count === 'all' ? fr.quiz.countAll : count}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="start-bar">
          <p className="muted" aria-live="polite">
            {available === 0 ? fr.quiz.none : fr.quiz.available(available)}
          </p>
          <button type="submit" disabled={!canStart}>
            {fr.quiz.start(cardCount)}
            <Icon name="arrowRight" />
          </button>
        </div>
      </form>
    </main>
  );
}
