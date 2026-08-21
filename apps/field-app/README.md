# Field App (PWA offline-first) & Calibration scientifique

> Propriétaire : Dev 3
> Dépend de : rien de bloquant pour démarrer (peut travailler en parallèle de Dev 1)
> Consommé par : `apps/backend/` (les déclarations envoyées), `packages/scoring-engine/yield-model/`
> Voir aussi : [`packages/scoring-engine/README.md`](../../packages/scoring-engine/README.md) · [Guide de collaboration](../../docs/COLLABORATION.md)

## 1. Rôle de ce module

Deux responsabilités liées : porter la crédibilité **scientifique** du scoring (le `yield-model`, dans `packages/scoring-engine/`) et porter l'**expérience terrain** du producteur ici, dans cette app.

## 2. Écrans / fonctionnalités (`src/`)

- `declaration/` : formulaire simple — quantité et type de matière première introduite, durée de fonctionnement du digesteur.
- `meter-reading/` : capture de la lecture du compteur à bulles, **uniquement via l'appareil photo intégré à l'app** (jamais depuis la galerie), avec horodatage et géolocalisation générés automatiquement à la prise de vue. Le QR code / numéro de série du compteur doit être visible dans le cadre de la photo.
- `offline-sync/` : file d'attente locale des déclarations non envoyées, synchronisation automatique dès qu'une connexion redevient disponible. WhatsApp reste un canal de secours — construire cette app en supposant un réseau **intermittent**, pas absent.

## 3. Contrainte non négociable

Le mode hors-ligne doit être **réellement testé**, pas seulement supposé fonctionner en théorie (couper le réseau et vérifier que la déclaration reste en file d'attente puis se synchronise).

## 4. Modèle de rendement — voir `packages/scoring-engine/yield-model/`

La partie calibration scientifique (table de référence par substrat, coefficients climatiques, sources) vit dans `packages/scoring-engine/yield-model/` puisqu'elle est consommée directement par le moteur de scoring. Documentation complète : [`packages/scoring-engine/README.md`](../../packages/scoring-engine/README.md) section "Modèle de rendement".

## 5. Livrable attendu pour la démo

Une interface de déclaration fonctionnelle et utilisable sans connexion réseau, alimentée par une table de rendement documentée et clairement versionnée (`v0.1`, limites assumées explicitement).

## 6. Points de vigilance

- **Ne pas chercher une précision scientifique irréaliste** — mieux vaut une fourchette large et honnête qu'un chiffre précis et faux.
- **Tester le mode hors-ligne réellement**, pas en théorie.

## 7. Setup local

```bash
npm install
npm run dev
```
