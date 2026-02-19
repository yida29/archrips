import { getCategoryColors, getCategoryLabel } from '../types.ts';

interface LegendProps {
  categories: string[];
  hiddenCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onShowAll: () => void;
}

export function Legend({ categories, hiddenCategories, onToggleCategory, onShowAll }: LegendProps) {
  return (
    <div
      className="absolute bottom-[140px] right-3 z-10 rounded-lg p-3 border"
      style={{
        background: 'var(--color-surface-primary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-content-tertiary)' }}
      >
        Legend
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {categories.map((cat) => {
          const colors = getCategoryColors(cat);
          const hidden = hiddenCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 text-left"
            >
              <div
                className="w-3 h-3 rounded-sm border"
                style={{
                  background: colors.bg,
                  borderColor: colors.border,
                  opacity: hidden ? 0.3 : 1,
                  transition: 'opacity 0.2s',
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: 'var(--color-content-secondary)',
                  opacity: hidden ? 0.4 : 1,
                  textDecoration: hidden ? 'line-through' : 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                {getCategoryLabel(cat)}
              </span>
            </button>
          );
        })}
      </div>
      {hiddenCategories.size > 0 && (
        <button
          onClick={onShowAll}
          className="mt-2 text-xs cursor-pointer hover:underline bg-transparent border-none p-0"
          style={{ color: 'var(--color-interactive-primary)' }}
        >
          Show All
        </button>
      )}
    </div>
  );
}
