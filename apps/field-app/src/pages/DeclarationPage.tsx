import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { apiSubmitDeclaration } from '../services/api'

const SUBSTRATS = ['fientes_volaille', 'fumier_bovin', 'lisier_porcin', 'restes_alimentaires', 'dechets_graisses_iaa', 'dechets_poisson_marche']

export function DeclarationForm() {
  const { addToQueue, isOnline } = useApp()
  const { location, error: geoError } = useGeolocation()
  const [substrate, setSubstrate] = useState('')
  const [quantityKg, setQuantityKg] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [meterReadingM3, setMeterReadingM3] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [producerId, setProducerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const declarationId = crypto.randomUUID()
      const capturedAt = new Date().toISOString()

      const decl = {
        declarationId,
        producerId,
        substrate,
        quantityKg: Number(quantityKg),
        durationHours: Number(durationHours),
        meterReadingM3: Number(meterReadingM3),
        meterPhotoUrl: photoUrl || 'storage://photos/capture.jpg',
        capturedAt,
        geoLocation: location || { lat: 0, lng: 0 },
      }

      if (isOnline && producerId) {
        await apiSubmitDeclaration(decl, '')
      }

      addToQueue({
        producerId,
        substrate,
        quantityKg: Number(quantityKg),
        durationHours: Number(durationHours),
        meterReadingM3: Number(meterReadingM3),
        meterPhotoUrl: photoUrl || 'storage://photos/capture.jpg',
        capturedAt,
        geoLocation: location || { lat: 0, lng: 0 },
      })

      setSubstrate('')
      setQuantityKg('')
      setDurationHours('')
      setMeterReadingM3('')
      setPhotoUrl('')
      setProducerId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2>📷 Nouvelle déclaration</h2>
      {error && <div className="alerte sur_declaration">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Producteur (ID)</label>
        <input value={producerId} onChange={e => setProducerId(e.target.value)} placeholder="UUID du producteur" required />

        <label>Substrat</label>
        <select value={substrate} onChange={e => setSubstrate(e.target.value)} required>
          <option value="">Sélectionner…</option>
          {SUBSTRATS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>Quantité (kg)</label>
        <input type="number" step="0.01" min="0.01" value={quantityKg} onChange={e => setQuantityKg(e.target.value)} placeholder="3.5" required />

        <label>Durée (heures)</label>
        <input type="number" step="1" min="1" value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="24" required />

        <label>Lecture compteur (m³)</label>
        <input type="number" step="0.001" min="0" value={meterReadingM3} onChange={e => setMeterReadingM3(e.target.value)} placeholder="0.19" required />

        <label>URL photo (storage://…)</label>
        <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="storage://photos/uuid.jpg" />

        <button type="submit" disabled={submitting || !substrate || !quantityKg || !meterReadingM3}>
          {submitting ? 'Envoi…' : (isOnline ? 'Soumettre' : 'Ajouter à la file (hors-ligne)')}
        </button>
      </form>

      {!navigator.geolocation && (
        <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '8px' }}>
          Géolocalisation non disponible
        </p>
      )}
      {geoError && (
        <p style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '8px' }}>
          GPS: {geoError}
        </p>
      )}
    </div>
  )
}