import { createContext, useContext } from 'react';
import type { TranslateRequest } from '../domain/translateApi.ts';
import type { TranslateResult } from './translateClient.ts';

export type Translate = (
  request: TranslateRequest,
  signal: AbortSignal,
) => Promise<TranslateResult>;

export const TranslatorContext = createContext<Translate | null>(null);

export function useTranslate(): Translate {
  const translate = useContext(TranslatorContext);
  if (!translate) throw new Error('useTranslate must be used inside <TranslatorProvider>');
  return translate;
}
