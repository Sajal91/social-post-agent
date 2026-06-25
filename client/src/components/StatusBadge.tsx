import type { WorkflowRun } from '../api/client'

const statusColors: Record<string, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#94a3b8',
  failed: '#ef4444',
}

export function StatusBadge({ status }: { status: WorkflowRun['status'] }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: statusColors[status] ?? '#64748b',
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  )
}
