# Spécification API

> Question à laquelle ce document répond : quels contrats HTTP relient le frontend et le backend ?
> Voir [`README.md`](./README.md) pour le registre producteur-consommateur. Codes d'erreur définis dans [`../architecture/contrat-systeme.md`](../architecture/contrat-systeme.md).

## Convention générale

- Toutes les routes (sauf `/auth/login`) nécessitent `Authorization: Bearer <token>`.
- Chaque route précise les rôles autorisés : `producteur`, `agent`, `imf`, `mmpe`.
- Réponses d'erreur au format :
```json
{ "statusCode": 400, "message": "Description", "error": "ERR-400-INVALID-DECLARATION" }
```
- Base URL locale : `http://localhost:3000/api`

## `POST /auth/login`
**Rôles** : public. **Réalise** : —
```json
// Requête
{ "phoneNumber": "+22507000000", "pin": "1234" }
// Réponse 200
{ "accessToken": "jwt...", "role": "producteur", "userId": "uuid" }
// Réponse 401
{ "statusCode": 401, "error": "ERR-401-UNAUTHORIZED" }
```

## `POST /producers`
**Rôles** : `agent`. **Réalise** : FR-001 (prérequis). **Vérifie** : INV-001.
```json
// Requête
{
  "name": "string", "phoneNumber": "string", "activityType": "elevage_volaille",
  "capacityDeclared": 30, "zone": "Bouaké", "climateZone": "sud",
  "meterSerialNumber": "BT-000123"
}
// Réponse 409 si le compteur est déjà assigné
{ "statusCode": 409, "error": "ERR-409-METER-ALREADY-ASSIGNED" }
```

## `GET /producers/:id`
**Rôles** : `agent`, `imf` (portefeuille), `mmpe`. **Réalise** : FR-005.

## `GET /producers/:id/score`
**Rôles** : `agent`, `imf`, `mmpe`, `producteur` (lui-même). **Réalise** : FR-005, FR-007 (prérequis). **Contrat critique** : consommé par `packages/payments/`.
```json
// Réponse 200
{
  "producerId": "uuid", "currentScore": 82, "trend": "stable",
  "eligibleForPayout": true, "lastAlert": null,
  "history": [{ "date": "2026-08-10", "score": 80 }]
}
```

## `POST /declarations`
**Rôles** : `producteur`, `agent`. **Réalise** : FR-001, FR-002. **Vérifie** : INV-002, INV-004. **Contrat critique** : produit par `apps/field-app/`.
```json
// Requête
{
  "producerId": "uuid", "substrate": "fientes_volaille", "quantityKg": 3.5,
  "durationHours": 24, "meterReadingM3": 0.19,
  "meterPhotoUrl": "storage://photos/uuid.jpg",
  "capturedAt": "2026-08-15T07:32:00Z",
  "geoLocation": { "lat": 7.69, "lng": -5.03 }
}
// Réponse 200
{ "declarationId": "uuid", "status": "received", "scoreUpdated": true, "alertTriggered": false }
// Réponse 422 si substrat inconnu
{ "statusCode": 422, "error": "ERR-422-UNKNOWN-SUBSTRATE" }
```

## `GET /declarations/:producerId`
**Rôles** : `agent`, `imf`, `mmpe`, `producteur` (lui-même). **Réalise** : FR-005.

## `GET /alerts`
**Rôles** : `agent`, `imf`, `mmpe`. **Réalise** : FR-004, FR-010.
```json
[{
  "producerId": "uuid", "type": "sur_declaration", "severity": "high",
  "detectedAt": "2026-08-14T10:00:00Z",
  "detail": "Lecture compteur +112% au-dessus de la fourchette attendue"
}]
```
Note : `type` ne prend jamais que `maintenance` ou `sur_declaration` — voir BR-001, BR-002.

## `POST /payments/payout`
**Rôles** : `agent`, `mmpe`. **Réalise** : FR-007. **Vérifie** : BR-003. **Contrat critique** : consommé par `packages/payments/`.
```json
// Requête
{ "producerId": "uuid", "amountFcfa": 15000 }
// Réponse 200
{ "status": "initiated", "transactionRef": "MM-xxxx" }
// Réponse 502 si l'opérateur Mobile Money est indisponible
{ "statusCode": 502, "error": "ERR-502-PAYMENT-PROVIDER-UNAVAILABLE" }
```

## À compléter au fur et à mesure

Chaque nouvel endpoint doit être ajouté ici **et** dans `README.md` (registre) **avant** de merger la PR qui l'introduit.
