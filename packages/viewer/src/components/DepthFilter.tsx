import { DEPTH_LEVELS } from '../types.ts';
import type { DepthLevel } from '../types.ts';

interface DepthFilterProps {
  depthLevel: DepthLevel;
  onSelect: (level: DepthLevel) => void;
}

export function DepthFilter({ depthLevel, onSelect }: DepthFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 w-64">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Depth
      </h3>
      <div className="flex gap-1">
        {DEPTH_LEVELS.map(({ level, label }) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`flex-1 text-xs py-1.5 px-2 rounded font-medium transition-colors cursor-pointer ${
              depthLevel === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
