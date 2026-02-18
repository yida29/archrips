import { useCallback, useMemo } from 'react';
import { useQueryState, parseAsString } from 'nuqs';

interface CategoryFilterState {
  hiddenCategories: Set<string>;
  toggleCategory: (category: string) => void;
  showAll: () => void;
}

export function useCategoryFilter(): CategoryFilterState {
  const [hideParam, setHideParam] = useQueryState('hide', parseAsString.withOptions({ history: 'replace' }));

  const hiddenCategories = useMemo(() => {
    if (!hideParam) return new Set<string>();
    return new Set(hideParam.split(',').filter(Boolean));
  }, [hideParam]);

  const toggleCategory = useCallback(
    (category: string) => {
      const next = new Set(hiddenCategories);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      void setHideParam(next.size > 0 ? [...next].join(',') : null);
    },
    [hiddenCategories, setHideParam],
  );

  const showAll = useCallback(() => {
    void setHideParam(null);
  }, [setHideParam]);

  return { hiddenCategories, toggleCategory, showAll };
}
