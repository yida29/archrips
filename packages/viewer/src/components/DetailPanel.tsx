import type { ArchNodeData, UseCase } from '../types.ts';
import { getCategoryColors, getCategoryLabel } from '../types.ts';

interface DetailPanelProps {
  data: ArchNodeData;
  useCases: UseCase[];
  onClose: () => void;
  onUseCaseClick: (useCaseId: string) => void;
}

export function DetailPanel({ data, useCases, onClose, onUseCaseClick }: DetailPanelProps) {
  const colors = getCategoryColors(data.category);

  return (
    <div
      className="fixed top-0 right-0 h-full w-[400px] z-50 overflow-y-auto border-l"
      style={{
        background: 'var(--color-surface-primary)',
        borderColor: 'var(--color-border-primary)',
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 border-b p-4 flex items-start justify-between"
        style={{
          background: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border-primary)',
        }}
      >
        <div>
          <span
            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {getCategoryLabel(data.category)}
          </span>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-content-primary)' }}>{data.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-xl leading-none p-1 cursor-pointer transition-colors"
          style={{ color: 'var(--color-content-tertiary)' }}
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="p-4 space-y-5 text-sm">
        {/* Description */}
        {data.description && (
          <Section title="Description">
            <p style={{ color: 'var(--color-content-secondary)' }}>{data.description}</p>
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
                className="underline break-all"
                style={{ color: 'var(--color-interactive-primary)' }}
              >
                {data.filePath}
              </a>
            ) : (
              <code
                className="px-1.5 py-0.5 rounded text-xs break-all"
                style={{ color: 'var(--color-content-secondary)', background: 'var(--color-surface-secondary)' }}
              >
                {data.filePath}
              </code>
            )}
          </Section>
        )}

        {/* Implements */}
        {data.implements && (
          <Section title="Implements">
            <code
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ color: 'var(--cat-port-text)', background: 'var(--cat-port-bg)' }}
            >
              {data.implements}
            </code>
          </Section>
        )}

        {/* External Service */}
        {data.externalService && (
          <Section title="External Service">
            <span style={{ color: 'var(--color-content-secondary)' }}>{data.externalService}</span>
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
                    <span style={{ color: 'var(--color-content-secondary)' }}>{path}</span>
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
                <code
                  key={m}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-content-secondary)' }}
                >
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
                  <tr style={{ background: 'var(--color-surface-secondary)' }}>
                    <th className="text-left p-1.5 font-semibold" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>Column</th>
                    <th className="text-left p-1.5 font-semibold" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>Type</th>
                    <th className="text-left p-1.5 font-semibold" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>Null</th>
                    <th className="text-left p-1.5 font-semibold" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>Key</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schema.columns.map((col) => (
                    <tr key={col.name} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                      <td className="p-1.5 font-mono" style={{ color: 'var(--color-content-primary)' }}>
                        {col.name}
                        {col.foreignKey && (
                          <span className="ml-1" style={{ color: 'var(--color-interactive-primary)' }} title={`FK: ${col.foreignKey.table}.${col.foreignKey.column}${col.foreignKey.onDelete ? ` (${col.foreignKey.onDelete})` : ''}`}>
                            FK
                          </span>
                        )}
                      </td>
                      <td className="p-1.5" style={{ color: 'var(--color-content-secondary)' }}>{col.type}</td>
                      <td className="p-1.5">{col.nullable ? <span className="text-yellow-600 dark:text-yellow-400">YES</span> : '-'}</td>
                      <td className="p-1.5" style={{ color: 'var(--color-content-tertiary)' }}>{col.index ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enum Values */}
            {data.schema.enumValues && Object.entries(data.schema.enumValues).map(([field, values]) => (
              <div key={field} className="mt-2">
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-content-secondary)' }}>{field} values:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(values).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ background: 'var(--cat-controller-bg)', color: 'var(--cat-controller-text)' }}
                    >
                      {k}={v}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Indexes */}
            {data.schema.indexes && data.schema.indexes.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-content-secondary)' }}>Indexes:</div>
                <ul className="text-xs space-y-0.5" style={{ color: 'var(--color-content-secondary)' }}>
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
              {data.useCases.map((ucId) => {
                const ucName = useCases.find(uc => uc.id === ucId)?.name ?? ucId;
                return (
                  <button
                    key={ucId}
                    onClick={() => onUseCaseClick(ucId)}
                    className="px-2 py-1 rounded text-xs transition-colors cursor-pointer border"
                    style={{
                      background: 'var(--color-surface-secondary)',
                      color: 'var(--color-interactive-primary)',
                      borderColor: 'var(--color-border-primary)',
                    }}
                  >
                    {ucName}
                  </button>
                );
              })}
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
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-content-tertiary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return 'text-green-600 dark:text-green-400';
    case 'POST': return 'text-blue-600 dark:text-blue-400';
    case 'PUT': return 'text-yellow-600 dark:text-yellow-400';
    case 'PATCH': return 'text-orange-600 dark:text-orange-400';
    case 'DELETE': return 'text-red-600 dark:text-red-400';
    default: return '';
  }
}
