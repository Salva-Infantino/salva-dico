import { browserStorage } from '../../data/browserStorage.ts';
import { DEFAULT_QUIZ_SETTINGS, quizSettingsSchema, type QuizSettings } from '../../domain/quiz.ts';

const KEY = 'salva-dico:quiz-settings';

/**
 * The last quiz settings, so a new quiz starts in one tap. A per-device convenience:
 * invalid or missing values fall back to the defaults.
 */
export function loadQuizSettings(storage = browserStorage()): QuizSettings {
  try {
    const parsed = quizSettingsSchema.safeParse(JSON.parse(storage.getItem(KEY) ?? 'null'));
    return parsed.success ? parsed.data : DEFAULT_QUIZ_SETTINGS;
  } catch {
    return DEFAULT_QUIZ_SETTINGS;
  }
}

export function saveQuizSettings(settings: QuizSettings, storage = browserStorage()): void {
  try {
    storage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Quota or blocked storage: the settings are simply not remembered.
  }
}
