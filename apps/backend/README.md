# Backend — NestJS, moteur de scoring, sécurité

> Propriétaire : Dev 1
> Dépend de : `packages/scoring-engine/yield-model/` (Dev 3) pour les coefficients de rendement
> Consommé par : `apps/field-app/` (déclarations), `apps/dashboard/`, `packages/payments/` (Dev 2)
> Voir aussi : [`docs/API.md`](./docs/API.md) · [`docs/DATABASE.md`](./docs/DATABASE.md) · [Guide de collaboration](../../docs/COLLABORATION.md)

## 1. Rôle de ce module

C'est le cœur du projet : la partie qui transforme une déclaration brute en score de confiance exploitable. C'est aussi la partie la plus scrutée par le jury, car elle répond à la question centrale : *comment fait-on confiance à une donnée sans capteur électronique fiable ?*

## 2. Découpage en sous-modules (`src/`)

### `declarations/`
- Reçoit les déclarations envoyées par `field-app` : matière première, quantité, durée de fonctionnement, lecture du compteur, photo.
- Valide le format avant d'enregistrer.
- Déclenche automatiquement un recalcul du score après chaque nouvelle déclaration.

### `scoring/`
- Orchestre l'appel à `packages/scoring-engine` : récupère les données nécessaires, appelle le calcul, enregistre le résultat.
- Expose le score et l'historique via l'API (voir `docs/API.md`).
- Déclenche une alerte si le score passe sous le seuil ou en cas de sur-déclaration détectée.

### `auth/`
- Rôles avec permissions distinctes :
  - **Producteur** : soumet ses propres déclarations, voit son propre score.
  - **Agent terrain** : soumet une déclaration pour un producteur, voit les infos de sa zone.
  - **IMF** : lecture seule sur les scores des producteurs qu'elle suit.
  - **MMPE** : lecture seule sur l'ensemble, vue agrégée, priorisation d'audits.
- Chaque endpoint déclare explicitement quel(s) rôle(s) peu(ven)t y accéder.

### `anti-fraud/`
- Vérifie que le compteur associé à une déclaration correspond bien au compteur assigné au producteur (identifiant unique visible sur la photo).
- Vérifie que la photo a été prise via l'appareil photo intégré à l'app (horodatage + géolocalisation générés à la capture, jamais une image importée).
- Applique la règle centrale : **sous-performance ≠ fraude** (détail complet dans `packages/scoring-engine/README.md`).

### `producers/`
- CRUD producteurs, association producteur ↔ compteur physique, historique de scores.

## 3. Base de données

Voir [`docs/DATABASE.md`](./docs/DATABASE.md) pour le schéma complet.

## 4. Livrable attendu pour la démo (sélection SIREXE, 1-8 sept 2026)

Un flux fonctionnel où une déclaration entrée dans l'app déclenche un calcul de score visible en quelques secondes, avec une alerte claire si les valeurs sont incohérentes — acceptable sur données simulées réalistes tant que le mécanisme est réel.

## 5. Points de vigilance

- **Ne pas viser un scoring parfait.** Un scoring simple mais qui tourne de bout en bout > un scoring brillant qui ne se connecte à rien.
- **Documenter tous les seuils de tolérance** (ex. ±15%) en commentaire de code et dans `packages/scoring-engine/README.md`.
- **Le modèle de rendement va évoluer.** Ne jamais hardcoder les coefficients de `yield-model` — toujours passer par l'interface définie dans `packages/scoring-engine/README.md`.
- **Sécurité applicative** : validation stricte des entrées, pas d'injection SQL, rôles vérifiés côté serveur, pas de données sensibles en clair dans les logs.

## 6. Setup local

```bash
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, STORAGE_BUCKET...
npm run start:dev
```

## 7. Tests attendus

- Tests unitaires sur le moteur de scoring (cas cohérent, cas sur-déclaration, cas sous-performance).
- Test d'intégration sur le flux complet déclaration → score → alerte.
