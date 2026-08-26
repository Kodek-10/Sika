# Scénario MVP — parcours d'intégration commun

> Question à laquelle ce document répond : quel parcours doit fonctionner de bout en bout avant toute fusion vers `main`, et qu'est-ce qu'on montre au jury ?
> Ce scénario est le test d'acceptation final — s'il échoue, on ne fusionne pas vers `main`, quel que soit l'état des tests unitaires.

## 1. Objectif

Démontrer le flux central sur données simulées réalistes : **Déclaration → Relevé compteur → Score en direct → Alerte**, avec une démonstration additionnelle du versement Mobile Money.

## 2. État de jouabilité

| Étape | Jouable aujourd'hui | Par quoi |
|---|---|---|
| 1 à 8 | **Oui, via l'API** | `curl` / client HTTP, backend + PostgreSQL |
| 1 à 8 | **Non via une interface** | `apps/field-app/` et `apps/dashboard/` n'existent pas |

Conséquence pour la démo de sélection : le parcours se montre en appels API commentés. C'est acceptable au sens de `apps/dashboard/README.md` (« non critique tant que le flux central est démontrable via l'API/logs »), mais c'est un point faible face à un jury — une interface, même minimale, change la perception.

## 3. Préparation

```bash
docker compose -f infra/docker-compose.yml up -d
infra/migrations/apply.sh
infra/seeds/demo-users.sh
cd packages/scoring-engine && npm i && npm run build && cd ../..
cd packages/payments      && npm i && npm run build && cd ../..
cd apps/backend && npm i && cp .env.example .env && npm run start:dev
```

Comptes de démo : agent `+2250700000002` / PIN `2222` (idem `imf` …003 et `mmpe` …004).

```bash
API=http://localhost:3000/api
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"+2250700000002","pin":"2222"}' | jq -r .accessToken)
AUTH="Authorization: Bearer $TOKEN"
```

## 4. Parcours pas à pas

| Étape | Action | Résultat attendu | Exigence vérifiée |
|---|---|---|---|
| 1 | Un agent crée un producteur avec un compteur assigné | Producteur visible, compteur associé de façon unique | FR-001 (prérequis), INV-001 |
| 2 | Le producteur soumet une déclaration cohérente avec le référentiel | Déclaration reçue, score calculé | FR-001, FR-002, FR-003 |
| 3 | Le score affiché est dans la fourchette normale, aucune alerte | Score visible, pas d'alerte | INV-005 |
| 4 | Deuxième déclaration avec une lecture **sous** la fourchette | Alerte `maintenance` générée, **score non dégradé** | BR-001, FRB-007 |
| 5 | Déclaration avec une lecture **très supérieure** (+100 %+) | Alerte `sur_declaration`, score dégradé | BR-002, FR-004, FR-010 |
| 6 | Un agent/MMPE consulte `GET /alerts` | Les alertes actives apparaissent, correctement typées | FR-010 |
| 7 | Versement pour un producteur éligible | Versement simulé initié | FR-007, BR-003 |
| 8 | (Tentative) versement pour un producteur non éligible | Refusé, **avec le motif exact** | BR-003 |

### Étape 1 — créer le producteur
```bash
PROD=$(curl -s -X POST $API/producers -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "name":"Coopérative Démo","phoneNumber":"+2250799000001",
  "activityType":"elevage_volaille","capacityDeclared":30,
  "zone":"Bouaké","climateZone":"sud","meterSerialNumber":"SM-DEMO-100"
}' | jq -r .producerId)
```

### Étapes 2 à 5 — déclarations
Le référentiel provisoire donne `fientes_volaille` à 0,050–0,090 m³/kg, coefficient sud 1,00.
Pour 3,5 kg : fourchette attendue **0,175 – 0,315 m³**, tolérance ±15 % → **0,149 – 0,362**.

```bash
declare_it () {  # $1 = lecture m³
  curl -s -X POST $API/declarations -H "$AUTH" -H 'Content-Type: application/json' -d "{
    \"declarationId\":\"$(uuidgen)\",\"producerId\":\"$PROD\",
    \"substrate\":\"fientes_volaille\",\"quantityKg\":3.5,\"durationHours\":24,
    \"meterReadingM3\":$1,\"meterPhotoUrl\":\"storage://photos/demo.jpg\",
    \"capturedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"geoLocation\":{\"lat\":7.69,\"lng\":-5.03}
  }" | jq -c
}

declare_it 0.25   # étape 2-3 : cohérent    → aucune alerte
declare_it 0.05   # étape 4   : sous-perf   → alerte maintenance, score NON dégradé
declare_it 0.70   # étape 5   : +122 %      → alerte sur_declaration, score dégradé
```

**Le moment fort de la démo est l'étape 4.** Comparer le score avant et après :
```bash
curl -s $API/producers/$PROD/score -H "$AUTH" | jq '{currentScore, trend, eligibility}'
```
Le score ne baisse pas alors qu'une alerte est levée. C'est BR-001, et c'est la décision produit la plus défendable du projet : il est physiquement plus facile de sous-produire que de sur-produire, donc une sous-performance est un problème d'entretien, pas une fraude.

### Étape 6 — alertes actives
```bash
curl -s "$API/alerts" -H "$AUTH" | jq '.[] | {type, severity, resolved, detail}'
```
Par défaut, seules les alertes **non résolues** remontent (FR-010).

### Étapes 7 et 8 — versement
```bash
curl -s -X POST $API/payments/payout -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"producerId\":\"$PROD\",\"amountFcfa\":15000,\"idempotencyKey\":\"demo-001\"}" | jq
```
À ce stade le producteur porte une alerte `sur_declaration` non résolue : le versement est **refusé** avec le motif (étape 8). Le résoudre puis rejouer montre l'étape 7 :
```bash
ALERTE=$(curl -s "$API/alerts" -H "$AUTH" | jq -r '.[] | select(.type=="sur_declaration") | .alertId' | head -1)
curl -s -X PATCH $API/alerts/$ALERTE/resolve -H "$AUTH" | jq -c
```

**Deux démonstrations qui valent le détour :**
```bash
# Idempotence : rejouer le MÊME appel ne verse pas deux fois
curl -s -X POST $API/payments/payout -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"producerId\":\"$PROD\",\"amountFcfa\":15000,\"idempotencyKey\":\"demo-001\"}" | jq
# → alreadyProcessed: true, même transactionRef

# Opérateur indisponible : relancer le backend avec SIKA_MM_SIMULATION=indisponible
# → ERR-502, versement conservé en `failed` avec sa raison, aucune relance automatique
```

## 5. Checklist avant présentation au jury

- [ ] Étapes 1 à 8 exécutées sans erreur sur environnement local ou de démo.
- [ ] Le contraste étape 4 / étape 5 (alerte sans sanction vs alerte avec sanction) est expliqué à l'oral.
- [ ] Les seuils utilisés (±15 %, +100 %, score 70, 3 déclarations) peuvent être justifiés — voir `../architecture/contrat-systeme.md` et `../decisions/DECISIONS-DEV2.md`.
- [ ] Distinction visuelle `maintenance` vs `sur_declaration` (FRB-005) : **non vérifiable, aucune interface**.
- [ ] Mode hors-ligne (FRB-002) : **non testable, `apps/field-app/` n'existe pas**. Ne pas le présenter comme fonctionnel.
- [ ] Le statut réel des partenariats (`packages/payments/PARTNERSHIPS.md` : aucun signé) est cohérent avec ce qui sera dit à l'oral (BR-004).
- [ ] Le caractère **simulé** du versement et **non calibré** du référentiel de rendement est annoncé, pas laissé à découvrir.

## 6. Ce que ce scénario ne couvre pas (assumé pour le hackathon)

- Vérification carbone certifiée.
- Volume réel de producteurs (le scénario fonctionne avec 1 à 2 producteurs de test).
- Résilience à la charge (non pertinent pour une démo).
- Parcours hors-ligne réel et interfaces utilisateur.

## 7. Règle de fusion

Ce scénario doit être rejoué manuellement avant toute fusion d'une branche `feat/*` vers `dev`, si la branche touche au flux central (déclarations, scoring, alertes, paiement). Une fusion qui casse ce parcours est bloquante, indépendamment des tests unitaires individuels.
