import { getCategoryColors, getCategoryLabel } from '../types.ts';

interface LegendProps {
  categories: string[];
}

export function Legend({ categories }: LegendProps) {
  return (
    <div className="absolute bottom-3 right-3 z-10 bg-white rounded-lg shadow-md border border-gray-200 p-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legend</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {categories.map((cat) => {
          const colors = getCategoryColors(cat);
          return (
            <div key={cat} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm border"
                style={{ background: colors.bg, borderColor: colors.border }}
              />
              <span className="text-xs text-gray-600">{getCategoryLabel(cat)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
