const API_BASE = '/api'

export async function apiLogin(phoneNumber: string, pin: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, pin }),
  })
  if (!res.ok) throw new Error('Identifiants invalides')
  return res.json()
}

export async function apiGetProducerScore(producerId: string, token: string) {
  const res = await fetch(`${API_BASE}/producers/${producerId}/score`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de charger le score')
  return res.json()
}

export async function apiGetDeclarations(producerId: string, token: string) {
  const res = await fetch(`${API_BASE}/declarations/${producerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de charger l\'historique')
  return res.json()
}

export async function apiSubmitDeclaration(
  declaration: {
    declarationId: string; producerId: string; substrate: string;
    quantityKg: number; durationHours: number; meterReadingM3: number;
    meterPhotoUrl: string; capturedAt: string; geoLocation: { lat: number; lng: number };
  },
  token: string,
) {
  const res = await fetch(`${API_BASE}/declarations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(declaration),
  })
  if (!res.ok) throw new Error('Erreur lors de la soumission')
  return res.json()
}

export async function apiGetAlerts(token: string) {
  const res = await fetch(`${API_BASE}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de charger les alertes')
  return res.json()
}

export async function apiResolveAlert(alertId: string, token: string) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de résoudre l\'alerte')
  return res.json()
}