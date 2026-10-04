import { describe, expect, it } from 'vitest';
import { LANGS } from '../../domain/languages.ts';
import type { EntryContent } from '../../domain/schemas.ts';
import {
  allerContent,
  arbreContent,
  seLeverContent,
  grandContent,
  makeEntry,
  sourisContent,
  sVousPlaitContent,
} from '../../test/fixtures.ts';
import {
  draftFromEntry,
  draftSignature,
  emptyDraft,
  emptyTranslation,
  validateDraft,
  type EntryDraft,
} from './entryDraft.ts';

function draftOf(content: EntryContent): EntryDraft {
  return draftFromEntry(makeEntry(content));
}

/** A complete, valid expression draft. */
function expressionDraft(): EntryDraft {
  const draft = emptyDraft({ type: 'expression' });
  for (const lang of LANGS) {
    draft.translations[lang] = [emptyTranslation(`hello ${lang}`)];
  }
  return draft;
}

describe('emptyDraft', () => {
  it('starts with one empty row per language, pre-filled in the start language', () => {
    const draft = emptyDraft({ lang: 'it', text: 'ragazzo' });
    expect(draft.type).toBe('noun');
    expect(draft.translations.it[0]?.text).toBe('ragazzo');
    expect(draft.translations.fr[0]?.text).toBe('');
  });
});

describe('draftFromEntry → validateDraft round trip', () => {
  it.each([
    ['noun', arbreContent],
    ['noun with irregular EN plural', sourisContent],
    ['adjective', grandContent],
    ['expression with several translations', sVousPlaitContent],
  ] as const)('keeps a %s unchanged', (_label, content) => {
    expect(validateDraft(draftOf(content))).toEqual({ ok: true, content });
  });

  it('keeps an uncountable noun without plural', () => {
    const content: EntryContent = {
      ...arbreContent,
      translations: {
        ...arbreContent.translations,
        es: [{ text: 'paciencia', gender: 'f', article: 'la' }],
      },
    };
    const draft = draftOf(content);
    expect(draft.translations.es[0]?.hasPlural).toBe(false);
    expect(validateDraft(draft)).toEqual({ ok: true, content });
  });

  it.each([
    ['verb', allerContent],
    ['reflexive verb', seLeverContent],
  ] as const)('keeps a %s with its full conjugation unchanged', (_label, content) => {
    expect(validateDraft(draftOf(content))).toEqual({ ok: true, content });
  });
});

describe('validateDraft', () => {
  it('trims values', () => {
    const draft = expressionDraft();
    draft.translations.fr = [emptyTranslation('  bonjour ')];
    const result = validateDraft(draft);
    expect(result.ok && result.content.translations.fr).toEqual([{ text: 'bonjour' }]);
  });

  it('ignores blank rows but requires one translation per language', () => {
    const draft = expressionDraft();
    draft.translations.fr.push(emptyTranslation(''));
    draft.translations.es = [emptyTranslation('  ')];
    expect(validateDraft(draft)).toEqual({ ok: false, errors: { es: 'missingLanguage' } });
  });

  it('maps errors to the draft row, even after a dropped blank row', () => {
    const draft = draftOf(arbreContent);
    const incomplete = { ...emptyTranslation('ragazzo'), article: 'il' };
    draft.translations.it = [emptyTranslation(''), incomplete];
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual({
      'it.1.gender': 'gender',
      'it.1.plural': 'required',
      'it.1.pluralArticle': 'required',
    });
  });

  it('requires the plural article together with the plural', () => {
    const draft = draftOf(arbreContent);
    const [fr] = draft.translations.fr;
    draft.translations.fr = [{ ...(fr ?? emptyTranslation()), pluralArticle: '' }];
    const result = validateDraft(draft);
    expect(!result.ok && result.errors['fr.0.pluralArticle']).toBe('required');
  });

  it('maps the masculine singular of an adjective to the main field', () => {
    const draft = draftOf(grandContent);
    const [it] = draft.translations.it;
    draft.translations.it = [{ ...(it ?? emptyTranslation()), text: '', femSing: '' }];
    const result = validateDraft(draft);
    expect(!result.ok && result.errors).toEqual({
      'it.0.text': 'required',
      'it.0.femSing': 'required',
    });
  });

  it('keeps typed words when the type changes', () => {
    const draft = draftOf(sVousPlaitContent);
    const result = validateDraft({ ...draft, type: 'noun' });
    expect(!result.ok && result.errors['fr.0.article']).toBe('required');
    expect(draft.translations.fr[0]?.text).toBe("s'il vous plaît");
  });
});

describe('validateDraft — verbs', () => {
  it('maps conjugation errors to each cell, the auxiliary and the imperative', () => {
    const draft = draftOf(allerContent);
    const [it] = draft.translations.it;
    if (!it) throw new Error('missing row');
    const presente = [...(it.tenses['presente'] ?? [])];
    presente[3] = ' ';
    draft.translations.it = [
      {
        ...it,
        auxiliary: '',
        tenses: { ...it.tenses, presente },
        imperativeNegative: ['non andare', '', 'non andate'],
      },
    ];
    const result = validateDraft(draft);
    expect(!result.ok && result.errors).toEqual({
      'it.0.conjugation.auxiliary': 'auxiliary',
      'it.0.conjugation.presente.3': 'required',
      'it.0.conjugation.imperativo.negative.1': 'required',
    });
  });

  it('requires the English past forms and uses the infinitive as base form', () => {
    const draft = draftOf(allerContent);
    const [en] = draft.translations.en;
    if (!en) throw new Error('missing row');
    draft.translations.en = [{ ...en, text: 'walk', pastSimple: '', pastParticiple: 'walked' }];
    const result = validateDraft(draft);
    expect(!result.ok && result.errors).toEqual({ 'en.0.conjugation.pastSimple': 'required' });

    draft.translations.en = [{ ...en, text: 'walk', pastSimple: 'walked', irregular: false }];
    const valid = validateDraft(draft);
    expect(valid.ok && valid.content.type === 'verb' && valid.content.translations.en).toEqual([
      {
        text: 'walk',
        conjugation: {
          base: 'walk',
          pastSimple: 'walked',
          pastParticiple: 'gone',
          irregular: false,
        },
      },
    ]);
  });

  it('starts a new verb with empty cells to fill', () => {
    const draft = emptyDraft({ type: 'verb', lang: 'es', text: 'hablar' });
    const result = validateDraft(draft);
    expect(!result.ok && result.errors['es.0.conjugation.presente.0']).toBe('required');
    expect(!result.ok && result.errors['fr']).toBe('missingLanguage');
  });
});

describe('draftSignature', () => {
  it('ignores row keys, blank rows and fields of other types', () => {
    const draft = expressionDraft();
    const copy = structuredClone(draft);
    copy.translations.fr = copy.translations.fr.map((t) => ({ ...t, key: 'other', article: 'le' }));
    copy.translations.en.push(emptyTranslation());
    expect(draftSignature(copy)).toBe(draftSignature(draft));
  });

  it('changes when a relevant value changes', () => {
    const draft = expressionDraft();
    const copy = structuredClone(draft);
    copy.translations.it = [emptyTranslation('ciao')];
    expect(draftSignature(copy)).not.toBe(draftSignature(draft));
  });
});
