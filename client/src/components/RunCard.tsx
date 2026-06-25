import type { WorkflowRun } from '../api/client'
import { StatusBadge } from './StatusBadge'

export function RunCard({
  run,
  selected,
  onSelect,
}: {
  run: WorkflowRun
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`run-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="run-card-header">
        <StatusBadge status={run.status} />
        <span className="run-state">{run.state.replace(/_/g, ' ')}</span>
      </div>
      <p className="run-prompt">{run.seedPrompt ?? 'Waiting for prompt…'}</p>
      <time className="run-time">
        {new Date(run.createdAt).toLocaleString()}
      </time>
    </button>
  )
}
