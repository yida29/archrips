import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ArchFlowNode } from '../../types.ts';
import { getCategoryColors, getCategoryIcon } from '../../types.ts';

export function GroupNode({ data, selected }: NodeProps<ArchFlowNode>) {
  const d = data;
  const colors = getCategoryColors(d.category);
  const icon = getCategoryIcon(d.category);

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div
        style={{
          background: colors.bg,
          border: `2px dashed ${selected ? 'var(--color-border-focus)' : colors.border}`,
          borderRadius: 12,
          padding: '8px 12px',
          minWidth: 160,
          maxWidth: 220,
          cursor: 'pointer',
          boxShadow: selected ? 'var(--shadow-node-selected)' : 'var(--shadow-node)',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          position: 'relative',
        }}
      >
        {/* Count badge */}
        {d.memberCount != null && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: colors.border,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              width: 20,
              height: 20,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {d.memberCount}
          </div>
        )}

        <div style={{ fontSize: 11, color: colors.text, opacity: 0.7, marginBottom: 2 }}>
          {icon} {d.category.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, lineHeight: 1.3, wordBreak: 'break-word' }}>
          {d.label}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </>
  );
}
