import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  approveUser,
  createAdminUser,
  fetchAdminUser,
  updateUserCredentials,
  updateUserStatus,
  type CredentialsForm,
  type WorkflowRun,
} from '../api/client'
import { RunCard } from '../components/RunCard'
import { StatusBadge } from '../components/StatusBadge'

const CREDENTIAL_KEYS: (keyof CredentialsForm)[] = [
  'geminiApiKey',
  'whatsappAccessToken',
  'whatsappPhoneNumberId',
  'whatsappVerifyToken',
  'publicBaseUrl',
  'postingDryRun',
  'facebookPageId',
  'facebookPageAccessToken',
  'instagramBusinessAccountId',
  'linkedinAccessToken',
  'linkedinOrganizationUrn',
]

const emptyCredentials: CredentialsForm = {
  geminiApiKey: '',
  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappVerifyToken: '',
  publicBaseUrl: '',
  postingDryRun: false,
  facebookPageId: '',
  facebookPageAccessToken: '',
  instagramBusinessAccountId: '',
  linkedinAccessToken: '',
  linkedinOrganizationUrn: '',
}

function formFromSaved(saved: CredentialsForm | null): CredentialsForm {
  if (!saved) return { ...emptyCredentials }
  return { ...emptyCredentials, ...saved }
}

function pickChanged(current: CredentialsForm, baseline: CredentialsForm): Partial<CredentialsForm> {
  const patch: Record<string, string | boolean | undefined> = {}
  for (const key of CREDENTIAL_KEYS) {
    if (current[key] !== baseline[key]) {
      patch[key] = current[key]
    }
  }
  return patch as Partial<CredentialsForm>
}

function CredentialsFormFields({
  value,
  onChange,
}: {
  value: CredentialsForm
  onChange: (next: CredentialsForm) => void
}) {
  function setField(key: keyof CredentialsForm, fieldValue: string | boolean) {
    onChange({ ...value, [key]: fieldValue })
  }

  return (
    <div className="form-grid">
      <label>
        Gemini API key
        <input
          type="password"
          autoComplete="off"
          value={value.geminiApiKey ?? ''}
          onChange={(e) => setField('geminiApiKey', e.target.value)}
        />
      </label>
      <label>
        WhatsApp access token
        <input
          type="password"
          autoComplete="off"
          value={value.whatsappAccessToken ?? ''}
          onChange={(e) => setField('whatsappAccessToken', e.target.value)}
        />
      </label>
      <label>
        WhatsApp phone number ID
        <input
          value={value.whatsappPhoneNumberId ?? ''}
          onChange={(e) => setField('whatsappPhoneNumberId', e.target.value)}
        />
      </label>
      <label>
        WhatsApp verify token
        <input
          type="password"
          autoComplete="off"
          value={value.whatsappVerifyToken ?? ''}
          onChange={(e) => setField('whatsappVerifyToken', e.target.value)}
        />
      </label>
      <label>
        Public base URL
        <input
          value={value.publicBaseUrl ?? ''}
          onChange={(e) => setField('publicBaseUrl', e.target.value)}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={value.postingDryRun ?? false}
          onChange={(e) => setField('postingDryRun', e.target.checked)}
        />
        Posting dry run
      </label>
      <label>
        Facebook page ID
        <input
          value={value.facebookPageId ?? ''}
          onChange={(e) => setField('facebookPageId', e.target.value)}
        />
      </label>
      <label>
        Facebook page access token
        <input
          type="password"
          autoComplete="off"
          value={value.facebookPageAccessToken ?? ''}
          onChange={(e) => setField('facebookPageAccessToken', e.target.value)}
        />
      </label>
      <label>
        Instagram business account ID
        <input
          value={value.instagramBusinessAccountId ?? ''}
          onChange={(e) => setField('instagramBusinessAccountId', e.target.value)}
        />
      </label>
      <label>
        LinkedIn access token
        <input
          type="password"
          autoComplete="off"
          value={value.linkedinAccessToken ?? ''}
          onChange={(e) => setField('linkedinAccessToken', e.target.value)}
        />
      </label>
      <label>
        LinkedIn organization URN
        <input
          value={value.linkedinOrganizationUrn ?? ''}
          onChange={(e) => setField('linkedinOrganizationUrn', e.target.value)}
        />
      </label>
    </div>
  )
}

function applySavedCredentials(
  saved: CredentialsForm | null,
  setCredentials: (form: CredentialsForm) => void,
  setSavedBaseline: (form: CredentialsForm) => void,
) {
  const form = formFromSaved(saved)
  setCredentials(form)
  setSavedBaseline(form)
}

export function AdminUserNew() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [credentials, setCredentials] = useState<CredentialsForm>(emptyCredentials)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createAdminUser({ name, email, password, credentials })
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <main className="admin-page">
      <Link to="/admin">← Back</Link>
      <h2>Add user</h2>
      {error && <div className="banner error">{error}</div>}
      <form className="panel" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <h3>Credentials</h3>
        <CredentialsFormFields value={credentials} onChange={setCredentials} />
        <button type="submit">Create active user</button>
      </form>
    </main>
  )
}

export function AdminUserDetail() {
  const { id } = useParams()
  const [credentials, setCredentials] = useState<CredentialsForm>(emptyCredentials)
  const [savedBaseline, setSavedBaseline] = useState<CredentialsForm>(emptyCredentials)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [allowedNumbers, setAllowedNumbers] = useState<string[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [userName, setUserName] = useState('')
  const [userStatus, setUserStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchAdminUser(id)
      .then((data) => {
        setUserName(data.user.name)
        setUserStatus(data.user.status)
        applySavedCredentials(data.credentialsForm, setCredentials, setSavedBaseline)
        setAllowedNumbers(data.allowedNumbers)
        setStats(data.stats)
        setRuns(data.recentRuns)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user'))
  }, [id])

  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setError(null)
    setMessage(null)

    const patch = pickChanged(credentials, savedBaseline)
    if (Object.keys(patch).length === 0) {
      setMessage('No credential changes to save')
      return
    }

    try {
      const result = await updateUserCredentials(id, patch)
      applySavedCredentials(result.credentialsForm, setCredentials, setSavedBaseline)
      setMessage('Credentials saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    }
  }

  async function handleApprove() {
    if (!id) return
    setError(null)
    setMessage(null)
    try {
      const patch = pickChanged(credentials, savedBaseline)
      await approveUser(id, Object.keys(patch).length > 0 ? patch : undefined)
      setUserStatus('active')
      if (Object.keys(patch).length > 0) {
        const refreshed = await fetchAdminUser(id)
        applySavedCredentials(refreshed.credentialsForm, setCredentials, setSavedBaseline)
      }
      setMessage('User approved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user')
    }
  }

  async function handleReject() {
    if (!id) return
    await updateUserStatus(id, 'rejected')
    setUserStatus('rejected')
    setMessage('User rejected')
  }

  const hasUnsavedChanges = Object.keys(pickChanged(credentials, savedBaseline)).length > 0

  return (
    <main className="admin-page">
      <Link to="/admin">← Back</Link>
      <h2>{userName || 'User'}</h2>
      <p>
        Status: <StatusBadge status={userStatus as 'active' | 'pending' | 'failed'} />
      </p>

      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner success">{message}</div>}

      <div className="stats-grid">
        {Object.entries(stats).map(([key, val]) => (
          <div key={key} className="stat-card">
            <span>{key}</span>
            <strong>{val}</strong>
          </div>
        ))}
      </div>

      {userStatus === 'pending' && (
        <div className="panel actions-row">
          <button type="button" onClick={handleApprove}>
            Approve & activate
          </button>
          <button type="button" className="btn-danger" onClick={handleReject}>
            Reject
          </button>
        </div>
      )}

      <form className="panel" onSubmit={handleSaveCredentials}>
        <h3>Integration credentials</h3>
        {hasUnsavedChanges && (
          <p className="hint">You have unsaved changes — only modified fields will be updated.</p>
        )}
        <CredentialsFormFields value={credentials} onChange={setCredentials} />
        <button type="submit">Save credentials</button>
      </form>

      <section className="panel">
        <h3>Verified WhatsApp numbers</h3>
        {allowedNumbers.length === 0 ? (
          <p className="empty">None yet — user adds these from Settings.</p>
        ) : (
          <ul>
            {allowedNumbers.map((phone) => (
              <li key={phone}>{phone}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3>Recent workflow runs</h3>
        {runs.length === 0 ? (
          <p className="empty">No runs yet.</p>
        ) : (
          runs.map((run) => <RunCard key={run._id} run={run} selected={false} onSelect={() => {}} />)
        )}
      </section>
    </main>
  )
}
