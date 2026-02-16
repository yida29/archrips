import type { UseCase } from '../types.ts';

interface UseCaseFilterProps {
  useCases: UseCase[];
  selectedUseCase: string | null;
  onSelect: (useCaseId: string | null) => void;
}

export function UseCaseFilter({ useCases, selectedUseCase, onSelect }: UseCaseFilterProps) {
  return (
    <div className="absolute top-3 left-3 z-10 bg-white rounded-lg shadow-md border border-gray-200 p-3 w-64">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Use Case Filter
      </h3>
      <select
        value={selectedUseCase ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        <option value="">Show All</option>
        {useCases.map((uc) => (
          <option key={uc.id} value={uc.id}>
            {uc.name}
          </option>
        ))}
      </select>
      {selectedUseCase && (
        <div className="mt-2">
          <p className="text-xs text-gray-600">
            {useCases.find((uc) => uc.id === selectedUseCase)?.description}
          </p>
          <button
            onClick={() => onSelect(null)}
            className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
