import type { ArchNodeData } from '../types.ts';
import { getCategoryColors, getCategoryLabel } from '../types.ts';

interface DetailPanelProps {
  data: ArchNodeData;
  onClose: () => void;
  onUseCaseClick: (useCaseId: string) => void;
}

export function DetailPanel({ data, onClose, onUseCaseClick }: DetailPanelProps) {
  const colors = getCategoryColors(data.category);

  return (
    <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-xl z-50 overflow-y-auto border-l border-gray-200">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-start justify-between">
        <div>
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {getCategoryLabel(data.category)}
          </span>
          <h2 className="text-lg font-bold text-gray-900">{data.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="p-4 space-y-5 text-sm">
        {/* Description */}
        {data.description && (
          <Section title="Description">
            <p className="text-gray-700">{data.description}</p>
          </Section>
        )}

        {/* Source Link */}
        {data.filePath && (
          <Section title="Source">
            {data.sourceUrl ? (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {data.filePath}
              </a>
            ) : (
              <code className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded text-xs break-all">
                {data.filePath}
              </code>
            )}
          </Section>
        )}

        {/* Implements */}
        {data.implements && (
          <Section title="Implements">
            <code className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs">
              {data.implements}
            </code>
          </Section>
        )}

        {/* External Service */}
        {data.externalService && (
          <Section title="External Service">
            <span className="text-gray-600">{data.externalService}</span>
          </Section>
        )}

        {/* Routes */}
        {data.routes && data.routes.length > 0 && (
          <Section title="Routes">
            <div className="space-y-1">
              {data.routes.map((route) => {
                const [method, ...pathParts] = route.split(' ');
                const path = pathParts.join(' ');
                return (
                  <div key={route} className="font-mono text-xs">
                    <span className={`inline-block w-14 font-bold ${methodColor(method ?? '')}`}>
                      {method}
                    </span>
                    <span className="text-gray-600">{path}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Methods */}
        {data.methods && data.methods.length > 0 && (
          <Section title="Methods">
            <div className="flex flex-wrap gap-1.5">
              {data.methods.map((m) => (
                <code key={m} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                  {m}()
                </code>
              ))}
            </div>
          </Section>
        )}

        {/* Schema */}
        {data.schema && (
          <Section title={`Table: ${data.schema.tableName}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-1.5 border-b border-gray-200 font-semibold">Column</th>
                    <th className="text-left p-1.5 border-b border-gray-200 font-semibold">Type</th>
                    <th className="text-left p-1.5 border-b border-gray-200 font-semibold">Null</th>
                    <th className="text-left p-1.5 border-b border-gray-200 font-semibold">Key</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schema.columns.map((col) => (
                    <tr key={col.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-1.5 font-mono text-gray-900">
                        {col.name}
                        {col.foreignKey && (
                          <span className="text-blue-500 ml-1" title={`FK: ${col.foreignKey.table}.${col.foreignKey.column}${col.foreignKey.onDelete ? ` (${col.foreignKey.onDelete})` : ''}`}>
                            FK
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-gray-600">{col.type}</td>
                      <td className="p-1.5">{col.nullable ? <span className="text-yellow-600">YES</span> : '-'}</td>
                      <td className="p-1.5 text-gray-500">{col.index ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enum Values */}
            {data.schema.enumValues && Object.entries(data.schema.enumValues).map(([field, values]) => (
              <div key={field} className="mt-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">{field} values:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(values).map(([k, v]) => (
                    <span key={k} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                      {k}={v}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Indexes */}
            {data.schema.indexes && data.schema.indexes.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Indexes:</div>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {data.schema.indexes.map((idx) => (
                    <li key={idx} className="font-mono">{idx}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* SQL Examples */}
        {data.sqlExamples && data.sqlExamples.length > 0 && (
          <Section title="SQL Examples">
            {data.sqlExamples.map((sql) => (
              <pre key={sql} className="bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto mb-1.5 whitespace-pre-wrap">
                {sql}
              </pre>
            ))}
          </Section>
        )}

        {/* Use Cases */}
        {data.useCases.length > 0 && (
          <Section title="Use Cases">
            <div className="flex flex-wrap gap-1.5">
              {data.useCases.map((ucId) => (
                <button
                  key={ucId}
                  onClick={() => onUseCaseClick(ucId)}
                  className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
                >
                  {ucId}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return 'text-green-600';
    case 'POST': return 'text-blue-600';
    case 'PUT': return 'text-yellow-600';
    case 'PATCH': return 'text-orange-600';
    case 'DELETE': return 'text-red-600';
    default: return 'text-gray-600';
  }
}
