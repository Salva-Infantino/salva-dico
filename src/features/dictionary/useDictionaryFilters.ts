import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { filtersToParams, parseFilters, type DictionaryFilters } from './searchParams.ts';

type FiltersChange =
  Partial<DictionaryFilters> | ((current: DictionaryFilters) => Partial<DictionaryFilters>);

/**
 * Dictionary filters stored in the URL.
 *
 * Updates are computed from the latest requested filters, not from the last render:
 * with the data router, URL updates are asynchronous, so two quick clicks on chips
 * would otherwise both start from the same stale state and one would be lost.
 */
export function useDictionaryFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const latest = useRef(filters);

  useLayoutEffect(() => {
    latest.current = filters;
  }, [filters]);

  const update = useCallback(
    (change: FiltersChange, options: { replace?: boolean } = {}) => {
      const current = latest.current;
      const next = { ...current, ...(typeof change === 'function' ? change(current) : change) };
      latest.current = next;
      setParams(filtersToParams(next), options);
    },
    [setParams],
  );

  return [filters, update] as const;
}
