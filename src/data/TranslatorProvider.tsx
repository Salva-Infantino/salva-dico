import { useCallback, type ReactNode } from 'react';
import { getFirebase } from './firebase.ts';
import { requestTranslation } from './translateClient.ts';
import { TranslatorContext, type Translate } from './TranslatorContext.ts';

/** AI translation through the Netlify function, authenticated with the user's ID token. */
export function TranslatorProvider({ children }: { children: ReactNode }) {
  const translate = useCallback<Translate>(
    (request, signal) =>
      requestTranslation(
        {
          fetch: (...args) => fetch(...args),
          getIdToken: async () => {
            const user = getFirebase().auth.currentUser;
            if (!user) throw new Error('Not signed in');
            return user.getIdToken();
          },
        },
        request,
        signal,
      ),
    [],
  );
  return <TranslatorContext value={translate}>{children}</TranslatorContext>;
}
