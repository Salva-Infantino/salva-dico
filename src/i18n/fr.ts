/**
 * All user-facing strings. The UI is French only, but keeping strings in one
 * module makes them easy to review and keeps components free of hardcoded text.
 */
export const fr = {
  app: {
    name: 'Salva Dico',
  },
  common: {
    loading: 'Chargement…',
  },
  langs: {
    fr: 'Français',
    en: 'Anglais',
    es: 'Espagnol',
    it: 'Italien',
  },
  entryTypes: {
    noun: 'Nom',
    verb: 'Verbe',
    adjective: 'Adjectif',
    expression: 'Expression',
  },
  grammar: {
    masculine: 'm.',
    feminine: 'f.',
    plural: 'pl.',
    irregular: 'irrégulier',
  },
  auth: {
    intro: 'Connecte-toi avec ton compte Google pour accéder à ton dictionnaire.',
    signIn: 'Se connecter avec Google',
    signInEmulator: 'Connexion de dev (émulateur)',
    signOut: 'Se déconnecter',
    errorOffline: 'Connexion impossible hors ligne. Réessaie une fois connecté à internet.',
    errorFailed: 'La connexion a échoué. Réessaie.',
    deniedTitle: 'Accès refusé',
    deniedText: "Ce compte n'est pas autorisé à utiliser ce dictionnaire.",
    accountId: 'Identifiant du compte',
  },
  home: {
    title: 'Dictionnaire',
    empty: 'Aucune entrée pour le moment.',
    entryCount: (count: number) => (count === 1 ? '1 entrée' : `${String(count)} entrées`),
    searchLabel: 'Rechercher',
    searchPlaceholder: 'Rechercher dans les 4 langues…',
    langFilter: 'Langues de recherche',
    typeFilter: "Types d'entrée",
    noResults: 'Aucun résultat.',
    resultCount: (count: number) => (count === 1 ? '1 résultat' : `${String(count)} résultats`),
    showMore: (remaining: number) => `Afficher plus (${String(remaining)} restantes)`,
  },
  entry: {
    back: 'Retour au dictionnaire',
    notFound: 'Entrée introuvable',
    mastered: 'Maîtrisé',
  },
  sync: {
    failed: 'La synchronisation a échoué. Tes données locales restent disponibles.',
  },
  notFound: {
    title: 'Page introuvable',
    backHome: 'Retour au dictionnaire',
  },
  pwa: {
    updateAvailable: 'Une nouvelle version est disponible.',
    reload: 'Mettre à jour',
    dismiss: 'Plus tard',
    offlineReady: "L'application est prête à fonctionner hors ligne.",
  },
} as const;
