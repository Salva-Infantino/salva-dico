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
  auth: {
    intro: 'Connecte-toi avec ton compte Google pour accéder à ton dictionnaire.',
    signIn: 'Se connecter avec Google',
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
