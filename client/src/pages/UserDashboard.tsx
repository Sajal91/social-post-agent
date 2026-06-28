import { useEffect, useState } from 'react'
import { fetchHealth, fetchRuns, type WorkflowRun } from '../api/client'
import { RunCard } from '../components/RunCard'
import { RunDetail } from '../pages/RunDetail'

export function UserDashboard() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [health, data] = await Promise.all([fetchHealth(), fetchRuns()])
        setHealthOk(health.ok)
        setRuns(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cannot reach API server')
        setHealthOk(false)
      }
    }

    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (runs.length > 0 && selectedId === null) {
      setSelectedId(runs[0]._id)
    }
  }, [runs, selectedId])

  return (
    <>
      <div className="hint">
        Message your WhatsApp bot: <code>Hey, Generate content</code>
      </div>

      <div className={`health-inline ${healthOk ? 'ok' : 'down'}`}>
        {healthOk === null ? '…' : healthOk ? 'API online' : 'API offline'}
      </div>

      {error && <div className="banner error">{error}</div>}

      <main className="dashboard">
        <aside className="run-list">
          <h2>Recent runs</h2>
          {runs.length === 0 ? (
            <p className="empty">No runs yet. Start one on WhatsApp.</p>
          ) : (
            runs.map((run) => (
              <RunCard
                key={run._id}
                run={run}
                selected={selectedId === run._id}
                onSelect={() => setSelectedId(run._id)}
              />
            ))
          )}
        </aside>
        <section className="detail-panel">
          <RunDetail runId={selectedId} />
        </section>
      </main>
    </>
  )
}
