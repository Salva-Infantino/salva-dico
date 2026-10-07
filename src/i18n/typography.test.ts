import { describe, expect, it } from 'vitest';
import { fr } from './fr.ts';
import { frenchSpacing, withFrenchSpacing } from './typography.ts';

const NBSP = ' ';
const NNBSP = ' ';

describe('frenchSpacing', () => {
  it('keeps high punctuation and guillemets with their word', () => {
    expect(frenchSpacing('Raccourci : /')).toBe(`Raccourci${NBSP}: /`);
    expect(frenchSpacing('Supprimer cette entrée ?')).toBe(`Supprimer cette entrée${NNBSP}?`);
    expect(frenchSpacing('Excellent !')).toBe(`Excellent${NNBSP}!`);
    expect(frenchSpacing('Ajouter « chat »')).toBe(`Ajouter «${NNBSP}chat${NNBSP}»`);
  });

  it('keeps a number with its unit, and a separator with the word before it', () => {
    expect(frenchSpacing('Réessaie dans 36 s.')).toBe(`Réessaie dans 36${NBSP}s.`);
    expect(frenchSpacing('vers 8 h 30')).toBe(`vers 8${NBSP}h${NBSP}30`);
    expect(frenchSpacing('Score : 90 %')).toBe(`Score${NBSP}: 90${NBSP}%`);
    expect(frenchSpacing('went · gone')).toBe(`went${NBSP}· gone`);
  });

  it('leaves other spaces alone', () => {
    expect(frenchSpacing('1 entrée, 3 cartes')).toBe('1 entrée, 3 cartes');
    expect(frenchSpacing('2 sur 2 du premier coup')).toBe('2 sur 2 du premier coup');
  });
});

describe('withFrenchSpacing', () => {
  it('converts nested strings and the results of message functions', () => {
    const messages = withFrenchSpacing({
      title: 'Quitter ?',
      nested: { open: (word: string) => `Voir « ${word} »`, count: 3 },
    });
    expect(messages.title).toBe(`Quitter${NNBSP}?`);
    expect(messages.nested.open('chat')).toBe(`Voir «${NNBSP}chat${NNBSP}»`);
    expect(messages.nested.count).toBe(3);
  });

  it('is applied to the French messages', () => {
    expect(fr.entry.deleteTitle).toBe(`Supprimer cette entrée${NNBSP}?`);
    expect(fr.ai.quota.minute(36)).toContain(`36${NBSP}s.`);
    expect(fr.quiz.scoreLabel(90)).toBe(`Score${NBSP}: 90${NBSP}%`);
  });
});
