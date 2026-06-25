import { useEffect, useState } from 'react'
import { fetchRun, type WorkflowRun } from '../api/client'
import { StatusBadge } from '../components/StatusBadge'

export function RunDetail({ runId }: { runId: string | null }) {
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setRun(null)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const data = await fetchRun(runId!)
        if (!cancelled) {
          setRun(data)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Could not load run details')
      }
    }

    load()
    const interval = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [runId])

  if (!runId) {
    return (
      <div className="detail-empty">
        <p>Select a run to view details</p>
      </div>
    )
  }

  if (error) return <div className="detail-error">{error}</div>
  if (!run) return <div className="detail-loading">Loading…</div>

  return (
    <div className="run-detail">
      <header>
        <h2>Run Details</h2>
        <StatusBadge status={run.status} />
      </header>

      <section>
        <h3>Workflow</h3>
        <dl className="detail-grid">
          <dt>State</dt>
          <dd>{run.state.replace(/_/g, ' ')}</dd>
          <dt>WhatsApp ID</dt>
          <dd>{run.waId}</dd>
          <dt>Seed prompt</dt>
          <dd>{run.seedPrompt ?? '—'}</dd>
        </dl>
      </section>

      {run.topics.length > 0 && (
        <section>
          <h3>Generated topics</h3>
          <ul className="topic-list">
            {run.topics.map((t) => (
              <li key={t.id} className={run.selectedTopic?.id === t.id ? 'selected' : ''}>
                <strong>{t.title}</strong>
                <span>{t.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.draft && (
        <section>
          <h3>Draft content</h3>
          <div className="draft-block">
            <h4>Facebook</h4>
            <p>{run.draft.facebook}</p>
          </div>
          <div className="draft-block">
            <h4>Instagram</h4>
            <p>{run.draft.instagram}</p>
          </div>
          <div className="draft-block">
            <h4>LinkedIn</h4>
            <p>{run.draft.linkedin}</p>
          </div>
          <div className="draft-block">
            <h4>Image prompt</h4>
            <p className="muted">{run.draft.imagePrompt}</p>
          </div>
        </section>
      )}

      {(run.imageUrl || run.imagePath) && (
        <section>
          <h3>Generated image</h3>
          <img
            src={run.imageUrl ?? `/uploads/${run.imagePath}`}
            alt="Generated post"
            className="preview-image"
          />
        </section>
      )}

      {run.selectedPlatforms.length > 0 && (
        <section>
          <h3>Selected platforms</h3>
          <p>{run.selectedPlatforms.join(', ')}</p>
        </section>
      )}

      {run.postResults.length > 0 && (
        <section>
          <h3>Post results</h3>
          <ul className="results-list">
            {run.postResults.map((r) => (
              <li key={r.platform} className={r.success ? 'success' : 'error'}>
                <strong>{r.platform}</strong>
                {r.success ? ` — Posted (${r.postId})` : ` — ${r.error}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.lastError && (
        <section className="error-section">
          <h3>Last error</h3>
          <p>{run.lastError}</p>
        </section>
      )}
    </div>
  )
}
