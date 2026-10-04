/**
 * All user-facing strings. The UI is French only, but keeping strings in one
 * module makes them easy to review and keeps components free of hardcoded text.
 */
export const fr = {
  app: {
    name: 'Salva Dico',
  },
  home: {
    title: 'Dictionnaire',
    empty: 'Aucune entrée pour le moment.',
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
