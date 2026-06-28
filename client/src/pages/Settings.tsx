import { type FormEvent, useEffect, useState } from 'react'
import {
  deleteWhatsAppNumber,
  fetchWhatsAppNumbers,
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
} from '../api/client'

export function Settings() {
  const [numbers, setNumbers] = useState<Array<{ id: string; phone: string; verified: boolean }>>(
    [],
  )
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadNumbers() {
    const data = await fetchWhatsAppNumbers()
    setNumbers(data)
  }

  useEffect(() => {
    loadNumbers().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      const result = await requestWhatsAppOtp(phone)
      setPendingPhone(result.phone)
      setMessage('OTP sent to WhatsApp. Enter the code below.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    if (!pendingPhone) return
    setError(null)
    try {
      await verifyWhatsAppOtp(pendingPhone, otp)
      setMessage('Number verified and added to allowlist')
      setOtp('')
      setPhone('')
      setPendingPhone(null)
      await loadNumbers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    }
  }

  async function handleRemove(id: string) {
    await deleteWhatsAppNumber(id)
    await loadNumbers()
  }

  return (
    <main className="settings-page">
      <h2>WhatsApp allowlist</h2>
      <p className="subtitle">
        Only verified numbers can trigger workflows on your WhatsApp bot. Adding a number sends an
        OTP to that WhatsApp.
      </p>

      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner success">{message}</div>}

      <section className="panel">
        <h3>Verified numbers</h3>
        {numbers.filter((n) => n.verified).length === 0 ? (
          <p className="empty">No verified numbers yet.</p>
        ) : (
          <ul className="number-list">
            {numbers
              .filter((n) => n.verified)
              .map((n) => (
                <li key={n.id}>
                  <span>{n.phone}</span>
                  <button type="button" className="btn-danger" onClick={() => handleRemove(n.id)}>
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <form className="panel" onSubmit={handleRequestOtp}>
        <h3>Add number</h3>
        <label>
          Phone (with country code, e.g. 919876543210)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <button type="submit">Send OTP via WhatsApp</button>
      </form>

      {pendingPhone && (
        <form className="panel" onSubmit={handleVerifyOtp}>
          <h3>Verify OTP for {pendingPhone}</h3>
          <label>
            6-digit code
            <input value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
          </label>
          <button type="submit">Verify & add</button>
        </form>
      )}
    </main>
  )
}
