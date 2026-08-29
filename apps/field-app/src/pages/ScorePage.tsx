import { useState, useEffect } from 'react'
import { apiGetProducerScore } from '../services/api'

interface ScoreData {
  producerId: string; currentScore: number | null; trend: string;
  eligibleForPayout: boolean; lastAlert: any; history: { date: string; score: number }[];
  eligibility: { threshold: number; declarationCount: number; minDeclarations: number; blockingAlerts: string[] };
}

export function ScorePage({ producerId }: { producerId: string }) {
  const [score, setScore] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!producerId) return
    setLoading(true)
    apiGetProducerScore(producerId, '')
      .then(data => { setScore(data); setError('') })
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [producerId])

  if (!producerId) return <div className="card"><p>Entrez un ID producteur pour voir le score.</p></div>

  if (loading) return <div className="card"><p>Chargement…</p></div>
  if (error) return <div className="card"><p style={{ color: '#f44336' }}>Erreur: {error}</p></div>
  if (!score) return null

  const scoreColor = score.currentScore === null ? '#ccc' :
    score.currentScore >= 80 ? '#4caf50' :
    score.currentScore >= 70 ? '#ff9800' : '#f44336'

  return (
    <div className="card">
      <h2>📊 Score de confiance</h2>
      <div className="jauge">
        <div className="jauge-bar">
          <div className={`jauge-fill ${score.currentScore === null ? '' : score.currentScore >= 80 ? 'secure' : score.currentScore >= 70 ? 'jauge-wrap' : 'jauge-danger'}`}
            style={{ width: score.currentScore !== null ? `${score.currentScore}%` : '0%' }} />
        </div>
        <span className="jauge-text" style={{ color: scoreColor }}>
          {score.currentScore !== null ? score.currentScore : '—'}
        </span>
      </div>
      <p>Trend: {score.trend} · Éligible: {score.eligibleForPayout ? '✅' : '❌'}</p>
      <p>Déclarations: {score.eligibility.declarationCount}/{score.eligibility.minDeclarations}</p>
      {score.eligibility.blockingAlerts.length > 0 && (
        <div>
          <strong>Alertes bloquantes:</strong>
          {score.eligibility.blockingAlerts.map((a, i) => <div key={i} className="alerte sur_declaration">{a}</div>)}
        </div>
      )}
      {score.history.length > 0 && (
        <div>
          <h3>Historique</h3>
          {score.history.map((h, i) => (
            <div key={i} className="history-item">
              <strong>{h.date}</strong>: {h.score}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}