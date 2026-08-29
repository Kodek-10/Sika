import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AppState {
  isOnline: boolean
  queue: DeclarationQueueItem[]
}

interface DeclarationQueueItem {
  id: string;
  producerId: string;
  substrate: string;
  quantityKg: number;
  durationHours: number;
  meterReadingM3: number;
  meterPhotoUrl: string;
  capturedAt: string;
  geoLocation: { lat: number; lng: number };
  status: 'pending' | 'synced' | 'error';
  createdAt: string;
}

interface AppContextType extends AppState {
  addToQueue: (item: Omit<DeclarationQueueItem, 'id' | 'createdAt' | 'status'>) => void;
  markSynced: (id: string) => void;
  markError: (id: string) => void;
  syncQueue: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState<DeclarationQueueItem[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sika_queue')
      if (stored) setQueue(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const persistQueue = useCallback((q: DeclarationQueueItem[]) => {
    setQueue(q)
    localStorage.setItem('sika_queue', JSON.stringify(q))
  }, [])

  const addToQueue = useCallback((item: Omit<DeclarationQueueItem, 'id' | 'createdAt' | 'status'>) => {
    const newItem: DeclarationQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    persistQueue([...queue, newItem])
  }, [queue, persistQueue])

  const markSynced = useCallback((id: string) => {
    persistQueue(queue.map(q => q.id === id ? { ...q, status: 'synced' as const } : q))
  }, [queue, persistQueue])

  const markError = useCallback((id: string) => {
    persistQueue(queue.map(q => q.id === id ? { ...q, status: 'error' as const } : q))
  }, [queue, persistQueue])

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return
    const pending = queue.filter(q => q.status === 'pending')
    for (const item of pending) {
      try {
        const res = await fetch('/api/declarations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            declarationId: item.id,
            producerId: item.producerId,
            substrate: item.substrate,
            quantityKg: item.quantityKg,
            durationHours: item.durationHours,
            meterReadingM3: item.meterReadingM3,
            meterPhotoUrl: item.meterPhotoUrl,
            capturedAt: item.capturedAt,
            geoLocation: item.geoLocation,
          }),
        })
        if (res.ok) {
          markSynced(item.id)
        } else {
          markError(item.id)
        }
      } catch {
        markError(item.id)
      }
    }
  }, [queue, markSynced, markError])

  useEffect(() => {
    if (isOnline && queue.some(q => q.status === 'pending')) {
      syncQueue()
    }
  }, [isOnline, queue, syncQueue])

  return (
    <AppContext.Provider value={{ isOnline, queue, addToQueue, markSynced, markError, syncQueue }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}