import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { filtersToParams, parseFilters, type DictionaryFilters } from './searchParams.ts';

export function useDictionaryFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const update = useCallback(
    (changes: Partial<DictionaryFilters>, options: { replace?: boolean } = {}) => {
      setParams((previous) => filtersToParams({ ...parseFilters(previous), ...changes }), options);
    },
    [setParams],
  );

  return [filters, update] as const;
}
