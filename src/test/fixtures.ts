import { CURRENT_SCHEMA_VERSION, type Entry, type EntryContent } from '../domain/schemas.ts';

/** Builds a stored entry around some content, with deterministic metadata. */
export function makeEntry<C extends EntryContent>(
  content: C,
  meta: Partial<Omit<Entry, 'type' | 'translations'>> = {},
): C & Omit<Entry, 'type' | 'translations'> {
  return {
    id: 'entry-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    mastered: false,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    deleted: false,
    ...meta,
    ...content,
  };
}

export const garconContent = {
  type: 'noun',
  translations: {
    fr: [{ text: 'garçon', gender: 'm', article: 'le', plural: 'garçons', pluralArticle: 'les' }],
    en: [{ text: 'boy' }],
    es: [{ text: 'chico', gender: 'm', article: 'el', plural: 'chicos', pluralArticle: 'los' }],
    it: [{ text: 'ragazzo', gender: 'm', article: 'il', plural: 'ragazzi', pluralArticle: 'i' }],
  },
} as const satisfies EntryContent;

export const arbreContent = {
  type: 'noun',
  translations: {
    fr: [{ text: 'arbre', gender: 'm', article: "l'", plural: 'arbres', pluralArticle: 'les' }],
    en: [{ text: 'tree' }],
    es: [{ text: 'árbol', gender: 'm', article: 'el', plural: 'árboles', pluralArticle: 'los' }],
    it: [{ text: 'albero', gender: 'm', article: "l'", plural: 'alberi', pluralArticle: 'gli' }],
  },
} as const satisfies EntryContent;

export const sourisContent = {
  type: 'noun',
  translations: {
    fr: [{ text: 'souris', gender: 'f', article: 'la', plural: 'souris', pluralArticle: 'les' }],
    en: [{ text: 'mouse', plural: 'mice' }],
    es: [{ text: 'ratón', gender: 'm', article: 'el', plural: 'ratones', pluralArticle: 'los' }],
    it: [{ text: 'topo', gender: 'm', article: 'il', plural: 'topi', pluralArticle: 'i' }],
  },
} as const satisfies EntryContent;

export const grandContent = {
  type: 'adjective',
  translations: {
    fr: [{ mascSing: 'grand', femSing: 'grande', mascPlural: 'grands', femPlural: 'grandes' }],
    en: [{ text: 'big' }],
    es: [{ mascSing: 'grande', femSing: 'grande', mascPlural: 'grandes', femPlural: 'grandes' }],
    it: [{ mascSing: 'grande', femSing: 'grande', mascPlural: 'grandi', femPlural: 'grandi' }],
  },
} as const satisfies EntryContent;

export const sVousPlaitContent = {
  type: 'expression',
  translations: {
    fr: [{ text: "s'il vous plaît" }, { text: "s'il te plaît" }],
    en: [{ text: 'please' }],
    es: [{ text: 'por favor' }],
    it: [{ text: 'per favore' }],
  },
} as const satisfies EntryContent;

export const allerContent = {
  type: 'verb',
  translations: {
    fr: [
      {
        text: 'aller',
        conjugation: {
          auxiliary: 'être',
          present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
          passeCompose: [
            'suis allé(e)',
            'es allé(e)',
            'est allé(e)',
            'sommes allé(e)s',
            'êtes allé(e)(s)',
            'sont allé(e)s',
          ],
          imparfait: ['allais', 'allais', 'allait', 'allions', 'alliez', 'allaient'],
          futurSimple: ['irai', 'iras', 'ira', 'irons', 'irez', 'iront'],
          conditionnelPresent: ['irais', 'irais', 'irait', 'irions', 'iriez', 'iraient'],
          imperatifPresent: {
            affirmative: ['va', 'allons', 'allez'],
            negative: ['ne va pas', "n'allons pas", "n'allez pas"],
          },
        },
      },
    ],
    en: [
      {
        text: 'go',
        conjugation: { base: 'go', pastSimple: 'went', pastParticiple: 'gone', irregular: true },
      },
    ],
    es: [
      {
        text: 'ir',
        conjugation: {
          presente: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
          preteritoPerfecto: ['he ido', 'has ido', 'ha ido', 'hemos ido', 'habéis ido', 'han ido'],
          preteritoIndefinido: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
          preteritoImperfecto: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
          futuroSimple: ['iré', 'irás', 'irá', 'iremos', 'iréis', 'irán'],
          condicional: ['iría', 'irías', 'iría', 'iríamos', 'iríais', 'irían'],
          imperativo: {
            affirmative: ['ve', 'vamos', 'id'],
            negative: ['no vayas', 'no vayamos', 'no vayáis'],
          },
        },
      },
    ],
    it: [
      {
        text: 'andare',
        conjugation: {
          auxiliary: 'essere',
          presente: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'],
          passatoProssimo: [
            'sono andato/a',
            'sei andato/a',
            'è andato/a',
            'siamo andati/e',
            'siete andati/e',
            'sono andati/e',
          ],
          imperfetto: ['andavo', 'andavi', 'andava', 'andavamo', 'andavate', 'andavano'],
          futuroSemplice: ['andrò', 'andrai', 'andrà', 'andremo', 'andrete', 'andranno'],
          condizionalePresente: [
            'andrei',
            'andresti',
            'andrebbe',
            'andremmo',
            'andreste',
            'andrebbero',
          ],
          imperativo: {
            affirmative: ["vai (va')", 'andiamo', 'andate'],
            negative: ['non andare', 'non andiamo', 'non andate'],
          },
        },
      },
    ],
  },
} as const satisfies EntryContent;

export const seLeverContent = {
  type: 'verb',
  translations: {
    fr: [
      {
        text: 'se lever',
        reflexive: true,
        conjugation: {
          auxiliary: 'être',
          present: ['me lève', 'te lèves', 'se lève', 'nous levons', 'vous levez', 'se lèvent'],
          passeCompose: [
            'me suis levé(e)',
            "t'es levé(e)",
            "s'est levé(e)",
            'nous sommes levé(e)s',
            'vous êtes levé(e)(s)',
            'se sont levé(e)s',
          ],
          imparfait: [
            'me levais',
            'te levais',
            'se levait',
            'nous levions',
            'vous leviez',
            'se levaient',
          ],
          futurSimple: [
            'me lèverai',
            'te lèveras',
            'se lèvera',
            'nous lèverons',
            'vous lèverez',
            'se lèveront',
          ],
          conditionnelPresent: [
            'me lèverais',
            'te lèverais',
            'se lèverait',
            'nous lèverions',
            'vous lèveriez',
            'se lèveraient',
          ],
          imperatifPresent: {
            affirmative: ['lève-toi', 'levons-nous', 'levez-vous'],
            negative: ['ne te lève pas', 'ne nous levons pas', 'ne vous levez pas'],
          },
        },
      },
    ],
    en: [
      {
        text: 'get up',
        conjugation: {
          base: 'get up',
          pastSimple: 'got up',
          pastParticiple: 'gotten up',
          irregular: true,
        },
      },
    ],
    es: [
      {
        text: 'levantarse',
        reflexive: true,
        conjugation: {
          presente: [
            'me levanto',
            'te levantas',
            'se levanta',
            'nos levantamos',
            'os levantáis',
            'se levantan',
          ],
          preteritoPerfecto: [
            'me he levantado',
            'te has levantado',
            'se ha levantado',
            'nos hemos levantado',
            'os habéis levantado',
            'se han levantado',
          ],
          preteritoIndefinido: [
            'me levanté',
            'te levantaste',
            'se levantó',
            'nos levantamos',
            'os levantasteis',
            'se levantaron',
          ],
          preteritoImperfecto: [
            'me levantaba',
            'te levantabas',
            'se levantaba',
            'nos levantábamos',
            'os levantabais',
            'se levantaban',
          ],
          futuroSimple: [
            'me levantaré',
            'te levantarás',
            'se levantará',
            'nos levantaremos',
            'os levantaréis',
            'se levantarán',
          ],
          condicional: [
            'me levantaría',
            'te levantarías',
            'se levantaría',
            'nos levantaríamos',
            'os levantaríais',
            'se levantarían',
          ],
          imperativo: {
            affirmative: ['levántate', 'levantémonos', 'levantaos'],
            negative: ['no te levantes', 'no nos levantemos', 'no os levantéis'],
          },
        },
      },
    ],
    it: [
      {
        text: 'alzarsi',
        reflexive: true,
        conjugation: {
          auxiliary: 'essere',
          presente: ['mi alzo', 'ti alzi', 'si alza', 'ci alziamo', 'vi alzate', 'si alzano'],
          passatoProssimo: [
            'mi sono alzato/a',
            'ti sei alzato/a',
            'si è alzato/a',
            'ci siamo alzati/e',
            'vi siete alzati/e',
            'si sono alzati/e',
          ],
          imperfetto: [
            'mi alzavo',
            'ti alzavi',
            'si alzava',
            'ci alzavamo',
            'vi alzavate',
            'si alzavano',
          ],
          futuroSemplice: [
            'mi alzerò',
            'ti alzerai',
            'si alzerà',
            'ci alzeremo',
            'vi alzerete',
            'si alzeranno',
          ],
          condizionalePresente: [
            'mi alzerei',
            'ti alzeresti',
            'si alzerebbe',
            'ci alzeremmo',
            'vi alzereste',
            'si alzerebbero',
          ],
          imperativo: {
            affirmative: ['alzati', 'alziamoci', 'alzatevi'],
            negative: ['non alzarti', 'non alziamoci', 'non alzatevi'],
          },
        },
      },
    ],
  },
} as const satisfies EntryContent;

export const ALL_CONTENTS = [
  garconContent,
  arbreContent,
  sourisContent,
  grandContent,
  sVousPlaitContent,
  allerContent,
  seLeverContent,
] as const;
