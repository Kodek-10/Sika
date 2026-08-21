# Référence API — Backend NestJS

> Propriétaire : Dev 1 — source de vérité, à tenir à jour dans la même PR que tout changement d'endpoint (voir [Guide de collaboration](../../../docs/COLLABORATION.md)).
> Consommateurs : `apps/field-app/` (Dev 3), `packages/payments/` (Dev 2), `apps/dashboard/`.
> Base URL locale : `http://localhost:3000/api`

## 1. Convention générale

- Toutes les routes (sauf `/auth/login`) nécessitent un header `Authorization: Bearer <token>`.
- Chaque route précise les rôles autorisés : `producteur`, `agent`, `imf`, `mmpe`.
- Erreurs au format :

```json
{ "statusCode": 400, "message": "Description de l'erreur", "error": "Bad Request" }
```

## 2. Authentification

### `POST /auth/login`
Rôles : public.
```json
// Requête
{ "phoneNumber": "+22507000000", "pin": "1234" }
// Réponse
{ "accessToken": "jwt...", "role": "producteur", "userId": "uuid" }
```

## 3. Producteurs

### `POST /producers`
Rôles : `agent`.
```json
{
  "name": "Nom du producteur",
  "phoneNumber": "+2250700...",
  "activityType": "elevage_volaille",
  "capacityDeclared": 30,
  "zone": "Bouaké",
  "climateZone": "sud",
  "meterSerialNumber": "BT-000123"
}
```

### `GET /producers/:id`
Rôles : `agent`, `imf` (si dans son portefeuille), `mmpe`.

### `GET /producers/:id/score`
Rôles : `agent`, `imf`, `mmpe`, `producteur` (lui-même uniquement).
**Endpoint clé pour Dev 2** — détermine l'éligibilité à un versement Mobile Money.
```json
{
  "producerId": "uuid",
  "currentScore": 82,
  "trend": "stable",
  "eligibleForPayout": true,
  "lastAlert": null,
  "history": [{ "date": "2026-08-10", "score": 80 }]
}
```

## 4. Déclarations

### `POST /declarations`
Rôles : `producteur`, `agent`. Déclenche automatiquement un recalcul du score.
```json
{
  "producerId": "uuid",
  "substrate": "fientes_volaille",
  "quantityKg": 3.5,
  "durationHours": 24,
  "meterReadingM3": 0.19,
  "meterPhotoUrl": "storage://photos/uuid.jpg",
  "capturedAt": "2026-08-15T07:32:00Z",
  "geoLocation": { "lat": 7.69, "lng": -5.03 }
}
```

### `GET /declarations/:producerId`
Rôles : `agent`, `imf`, `mmpe`, `producteur` (lui-même).

## 5. Scoring & alertes

### `GET /alerts`
Rôles : `agent`, `imf`, `mmpe`.
```json
[{
  "producerId": "uuid",
  "type": "sur-declaration",
  "severity": "high",
  "detectedAt": "2026-08-14T10:00:00Z",
  "detail": "Lecture compteur +112% au-dessus de la fourchette attendue"
}]
```

## 6. Paiement (consommé par Dev 2)

### `POST /payments/payout`
Rôles : `agent`, `mmpe`.
```json
{ "producerId": "uuid", "amountFcfa": 15000 }
```

## 7. À compléter au fur et à mesure

Chaque nouvel endpoint doit être ajouté ici **avant** de merger la PR qui l'introduit.
