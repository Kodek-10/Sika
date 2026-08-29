import { useApp } from '../context/AppContext'

export function QueuePage() {
  const { queue } = useApp()

  return (
    <div className="card">
      <h2>📭 File d'attente ({queue.filter(q => q.status === 'pending').length} en attente)</h2>
      {queue.length === 0 && <p>File vide.</p>}
      {queue.map(item => (
        <div key={item.id} className="queue-item">
          <span className={`status-dot ${item.status}`} />
          <strong>{item.substrate}</strong> — {item.quantityKg} kg
          <br /><span style={{ fontSize: '0.8rem', color: '#888' }}>
            {item.status} · {new Date(item.createdAt).toLocaleString('fr-FR')}
          </span>
        </div>
      ))}
    </div>
  )
}