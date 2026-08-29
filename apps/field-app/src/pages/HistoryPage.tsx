import { useState, useEffect } from 'react'
import { apiGetDeclarations } from '../services/api'

interface DeclarationRow {
  declarationId: string; substrate: string; quantityKg: number;
  durationHours: number; declaredAt: string; meterReadingM3: number; capturedAt: string;
}

export function HistoryPage({ producerId }: { producerId: string }) {
  const [history, setHistory] = useState<DeclarationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!producerId) return
    setLoading(true)
    apiGetDeclarations(producerId, '')
      .then(data => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [producerId])

  if (!producerId) return <div className="card"><p>Entrez un ID producteur.</p></div>
  if (loading) return <div className="card"><p>Chargement…</p></div>

  return (
    <div className="card">
      <h2>📜 Historique des déclarations</h2>
      {history.length === 0 && <p>Aucune déclaration.</p>}
      {history.map(d => (
        <div key={d.declarationId} className="history-item">
          <strong>{d.substrate}</strong> — {d.quantityKg} kg / {d.meterReadingM3} m³ ({d.durationHours}h)
          <br /><span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(d.declaredAt).toLocaleDateString('fr-FR')}</span>
        </div>
      ))}
    </div>
  )
}