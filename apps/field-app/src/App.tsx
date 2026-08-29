import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { DeclarationForm } from './pages/DeclarationPage'
import { ScorePage } from './pages/ScorePage'
import { HistoryPage } from './pages/HistoryPage'
import { QueuePage } from './pages/QueuePage'

type Tab = 'declaration' | 'score' | 'history' | 'queue'

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('declaration')
  const { isOnline, queue } = useApp()
  const [producerId, setProducerId] = useState('')

  const pendingCount = queue.filter(q => q.status === 'pending').length

  return (
    <div className="app">
      <h1>🌿 Sika</h1>

      {isOnline ? (
        <div className="online-banner">🟢 En ligne</div>
      ) : (
        <div className="offline-banner">📴 Hors-ligne — les déclarations sont en file d'attente</div>
      )}

      <div className="card" style={{ marginBottom: '12px' }}>
        <label>Producteur ID</label>
        <input value={producerId} onChange={e => setProducerId(e.target.value)} placeholder="UUID du producteur" />
      </div>

      <nav style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['declaration', 'score', 'history', 'queue'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ flex: 1, minWidth: '80px', fontSize: '0.85rem', padding: '10px', background: activeTab === tab ? '#B8860B' : '#555' }}
          >
            {tab === 'declaration' ? '📷 Déclarer' :
             tab === 'score' ? '📊 Score' :
             tab === 'history' ? '📜 Historique' :
             `📭 File${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
          </button>
        ))}
      </nav>

      {activeTab === 'declaration' && <DeclarationForm />}
      {activeTab === 'score' && <ScorePage producerId={producerId} />}
      {activeTab === 'history' && <HistoryPage producerId={producerId} />}
      {activeTab === 'queue' && <QueuePage />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}