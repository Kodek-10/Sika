# Spécification API

> Question à laquelle ce document répond : quels contrats HTTP relient le frontend et le backend ?
> Voir [`README.md`](./README.md) pour le registre producteur-consommateur. Codes d'erreur définis dans [`../architecture/contrat-systeme.md`](../architecture/contrat-systeme.md).

## Convention générale

- Toutes les routes (sauf `/auth/login` et `/health`) nécessitent `Authorization: Bearer <token>`.
- Chaque route précise les rôles autorisés : `producteur`, `agent`, `imf`, `mmpe`.
- Un rôle `producteur` n'accède qu'à ses propres données (déclarations, score, versements) — vérifié côté serveur à partir du JWT, jamais d'après un champ du corps de requête.
- Réponses d'erreur au format :
```json
{ "statusCode": 400, "message": "Description", "error": "ERR-400-INVALID-DECLARATION" }
```
- Base URL locale : `http://localhost:3000/api`

## `GET /health`
**Rôles** : public. Sonde de disponibilité.
```json
{ "status": "ok" }
```

## `POST /auth/login`
**Rôles** : public. **Réalise** : —
```json
// Requête
{ "phoneNumber": "+22507000000", "pin": "1234" }
// Réponse 200
{ "accessToken": "jwt...", "role": "producteur", "userId": "uuid" }
// Réponse 401 — identique pour PIN erroné et numéro inconnu (pas d'énumération de comptes)
{ "statusCode": 401, "error": "ERR-401-UNAUTHORIZED" }
```

## `POST /producers`
**Rôles** : `agent`. **Réalise** : FR-001 (prérequis). **Vérifie** : INV-001.
```json
// Requête
{
  "name": "string", "phoneNumber": "+2250700000001", "activityType": "elevage_volaille",
  "capacityDeclared": 30, "zone": "Bouaké", "climateZone": "sud",
  "meterSerialNumber": "BT-000123"
}
// Réponse 201 — `generatedPin` n'est renvoyé QU'UNE FOIS, si aucun PIN n'était fourni
{ "producerId": "uuid", "name": "...", "generatedPin": "4821", "...": "..." }
// Réponse 409
{ "statusCode": 409, "error": "ERR-409-METER-ALREADY-ASSIGNED" }
{ "statusCode": 409, "error": "ERR-409-PHONE-ALREADY-REGISTERED" }
```
`capacityDeclared` est exprimée en **kg de substrat par jour** — voir le dictionnaire de données.

## `GET /producers/:id`
**Rôles** : `agent`, `imf`, `mmpe`. **Réalise** : FR-005.

## `GET /producers/:id/score`
**Rôles** : `agent`, `imf`, `mmpe`, `producteur` (lui-même). **Réalise** : FR-005, FR-007 (prérequis). **Contrat critique** : consommé par `packages/payments/`.
```json
// Réponse 200
{
  "producerId": "uuid", "currentScore": 82, "trend": "stable",
  "eligibleForPayout": true, "lastAlert": null,
  "history": [{ "date": "2026-08-10", "score": 80 }],
  "eligibility": {
    "threshold": 70, "declarationCount": 5,
    "minDeclarations": 3, "blockingAlerts": []
  }
}
```
- `currentScore` vaut `null` tant qu'aucune déclaration n'a été scorée. `trend` ∈ `hausse` | `stable` | `baisse`.
- `eligibility` explicite l'arbitrage BR-003 — il permet d'expliquer un refus de versement au lieu d'afficher un booléen muet. **C'est le seul endroit où l'éligibilité est décidée** : `packages/payments/` la consomme et ne la recalcule jamais.
- `blockingAlerts` ne contient jamais `maintenance` tant que D3 vaut `false` (BR-001 : sous-performance ≠ fraude).

## `POST /declarations`
**Rôles** : `producteur` (pour lui-même), `agent`. **Réalise** : FR-001, FR-002. **Vérifie** : INV-002, INV-004. **Contrat critique** : produit par `apps/field-app/`.
```json
// Requête
{
  "declarationId": "uuid-généré-par-le-client",
  "producerId": "uuid", "substrate": "fientes_volaille", "quantityKg": 3.5,
  "durationHours": 24, "meterReadingM3": 0.19,
  "meterPhotoUrl": "storage://photos/uuid.jpg",
  "capturedAt": "2026-08-15T07:32:00Z",
  "geoLocation": { "lat": 7.69, "lng": -5.03 }
}
// Réponse 200
{ "declarationId": "uuid", "status": "received", "scoreUpdated": true, "alertTriggered": false }
// Réponse 200 sur rejeu — aucun doublon créé
{ "declarationId": "uuid", "status": "already_received", "scoreUpdated": false, "alertTriggered": false }
// Réponse 422 si substrat inconnu
{ "statusCode": 422, "error": "ERR-422-UNKNOWN-SUBSTRATE" }
```

**`declarationId` porte l'idempotence** (guide-connecteur §2) : c'est un UUID généré par le client au moment de la création dans la file locale, pas par le serveur. Renvoyer deux fois le même identifiant après une coupure réseau ne crée pas de doublon et renvoie `already_received`. C'est la raison pour laquelle `declarations.id` n'a pas de `DEFAULT` en base.

**`meterPhotoUrl`** doit pointer vers le stockage objet Sika (`storage://…`). Une URL externe n'est pas rejetée en 400 : elle dégrade le signal de preuve (FRB-001). C'est le scoring qui sanctionne, pas la validation.

**`capturedAt` et `geoLocation`** sont réévalués côté serveur (plausibilité de l'horodatage, coordonnées dans les bornes, refus de `0,0`) — INV-002. Aucun flag de confiance envoyé par le client n'est accepté.

## `GET /declarations/:producerId`
**Rôles** : `agent`, `imf`, `mmpe`, `producteur` (lui-même). **Réalise** : FR-005.
```json
[{
  "declarationId": "uuid", "substrate": "fientes_volaille",
  "quantityKg": 3.5, "durationHours": 24,
  "declaredAt": "2026-08-15T07:35:00Z",
  "meterReadingM3": 0.19, "capturedAt": "2026-08-15T07:32:00Z"
}]
```

## `GET /alerts`
**Rôles** : `agent`, `imf`, `mmpe`. **Réalise** : FR-004, FR-010.

**Paramètre** `resolved` : `false` (défaut, alertes **actives** seules — c'est ce que vise FR-010), `true` (historique traité), `all`.
```json
[{
  "alertId": "uuid", "producerId": "uuid", "type": "sur_declaration", "severity": "high",
  "detectedAt": "2026-08-14T10:00:00Z", "resolved": false,
  "detail": "Lecture compteur +112 % au-dessus de la fourchette attendue"
}]
```
`type` ne prend jamais que `maintenance` ou `sur_declaration` — voir BR-001, BR-002.

## `PATCH /alerts/:id/resolve`
**Rôles** : `agent`, `mmpe` (l'IMF consulte mais n'arbitre pas le terrain). **Réalise** : prérequis de BR-003.

Marque une alerte comme traitée après vérification terrain. **Idempotent** : résoudre deux fois renvoie le même résultat. Sans ce point d'entrée, BR-003 (« aucune alerte non résolue ») serait mécaniquement inapplicable.
```json
// Réponse 200
{ "alertId": "uuid", "producerId": "uuid", "type": "maintenance", "resolved": true, "...": "..." }
// Réponse 404
{ "statusCode": 404, "error": "ERR-404-ALERT-NOT-FOUND" }
```

## `POST /payments/payout`
**Rôles** : `agent`, `mmpe`. **Réalise** : FR-007. **Vérifie** : BR-003. **Contrat critique** : implémenté par `packages/payments/`.
```json
// Requête — `idempotencyKey` optionnelle mais FORTEMENT recommandée
{ "producerId": "uuid", "amountFcfa": 15000, "idempotencyKey": "payout_..." }
// Réponse 200
{ "status": "initiated", "transactionRef": "MM-xxxx", "alreadyProcessed": false }
// Réponse 200 sur rejeu — aucun second versement
{ "status": "completed", "transactionRef": "MM-xxxx", "alreadyProcessed": true }
// Réponse 409 si le producteur n'est pas éligible (BR-003) — le message donne le motif
{ "statusCode": 409, "error": "ERR-409-PRODUCER-NOT-ELIGIBLE",
  "message": "Score 55 en dessous du seuil d'éligibilité (70)" }
// Réponse 502 si l'opérateur Mobile Money est indisponible
{ "statusCode": 502, "error": "ERR-502-PAYMENT-PROVIDER-UNAVAILABLE" }
```
`amountFcfa` est un **entier** (le FCFA n'a pas de subdivision), borné à 500 – 500 000.

Sans `idempotencyKey`, le serveur en dérive une depuis `producerId + amountFcfa + fenêtre horaire`. Cette dérivation a une limite connue (deux demandes encadrant une frontière de fenêtre produisent deux clés) — d'où la recommandation d'envoyer une clé explicite.

**Après un `ERR-502`, ne jamais relancer automatiquement** : on ne sait pas si l'argent est parti. Le versement est conservé en `failed` avec le détail de l'erreur, pour reprise manuelle (guide-connecteur §3).

## `GET /payments/:producerId`
**Rôles** : `agent`, `imf`, `mmpe`, `producteur` (lui-même). **Réalise** : FR-005.
```json
[{
  "paymentId": "uuid", "amountFcfa": 15000, "status": "completed",
  "transactionRef": "MM-xxxx", "failureDetail": null,
  "createdAt": "2026-08-15T09:00:00Z", "completedAt": "2026-08-15T09:00:04Z"
}]
```

## À compléter au fur et à mesure

Chaque nouvel endpoint doit être ajouté ici **et** dans `README.md` (registre) **avant** de merger la PR qui l'introduit.
