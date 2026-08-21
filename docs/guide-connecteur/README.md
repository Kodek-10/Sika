# Guide connecteur

> Question à laquelle ce document répond : comment une source de données externe entre dans le système, proprement et sans corruption ?
> S'applique à tout point d'entrée externe : capture photo compteur (Dev 3 → Dev 1), API Mobile Money (Dev 2), et tout futur connecteur (WhatsApp Business API en canal de secours).

## 1. Principe général

Un connecteur ne fait confiance à aucune donnée entrante par défaut. Il extrait, cartographie vers le modèle canonique (voir `../donnees/dictionnaire-de-donnees.md`), vérifie l'idempotence, avance un checkpoint, et met en quarantaine ce qu'il ne peut pas traiter — il ne rejette jamais silencieusement et ne devine jamais une valeur manquante.

## 2. Connecteur : capture de déclaration hors-ligne (`apps/field-app/` → `apps/backend/`)

### Extraction
La donnée source est la file d'attente locale de l'app (voir FR-008). Chaque élément de la file contient : formulaire de déclaration + fichier photo + métadonnées de capture (horodatage, géoloc).

### Cartographie
| Champ local (app) | Champ canonique (`declarations` / `meter_readings`) |
|---|---|
| `substrate_selected` | `declarations.substrate` |
| `quantity_input` | `declarations.quantity_kg` |
| `photo_capture.timestamp` | `meter_readings.captured_at` |
| `photo_capture.gps` | `meter_readings.geo_lat`, `geo_lng` |

### Idempotence
Chaque élément de la file porte un identifiant client généré localement (UUID) au moment de la création, envoyé avec la requête `POST /declarations`. Si le backend reçoit deux fois le même identifiant client (ex. re-synchronisation après coupure réseau en plein envoi), la seconde requête est acceptée sans créer de doublon — réponse identique à la première.

### Checkpoint
L'app marque un élément de la file comme "envoyé" seulement après confirmation 200 du backend, jamais avant émission de la requête. En cas de coupure pendant l'envoi, l'élément reste en file et sera retenté — l'idempotence côté serveur garantit l'absence de doublon.

### Quarantaine
Une déclaration rejetée par le backend (`ERR-422-UNKNOWN-SUBSTRATE`, `ERR-400-INVALID-DECLARATION`) n'est **pas** supprimée de la file locale ni renvoyée en boucle : elle passe dans un état "en erreur", visible par l'utilisateur, qui doit corriger avant nouvel envoi. Ne jamais réessayer automatiquement une déclaration rejetée pour une raison de validation (contrairement à un échec réseau, qui lui doit être retenté).

## 3. Connecteur : opérateur Mobile Money (`packages/payments/`)

### Extraction
Réponse de l'API de l'opérateur suite à `POST /payments/payout`.

### Cartographie
| Champ opérateur (variable selon le fournisseur) | Champ canonique (`payments`) |
|---|---|
| référence de transaction fournisseur | `payments.transaction_ref` |
| statut fournisseur (`success`/`pending`/`failed` ou équivalent) | `payments.status` (`initiated`, `completed`, `failed`) |

### Idempotence
Un `producer_id` + `amount_fcfa` + fenêtre temporelle donnée ne doit pas déclencher deux versements distincts si la requête est renvoyée par erreur (ex. double clic, retry automatique). Utiliser une clé d'idempotence côté requête vers l'opérateur si l'API le permet.

### Checkpoint
Le statut `payments.status` n'est mis à `completed` qu'après confirmation explicite de l'opérateur, jamais de façon optimiste dès l'envoi de la requête.

### Quarantaine
Un échec d'appel à l'opérateur (`ERR-502-PAYMENT-PROVIDER-UNAVAILABLE`) place le paiement en `failed` avec le détail de l'erreur conservé, pour permettre une relance manuelle — jamais de relance automatique silencieuse sur un paiement (risque de double versement).

## 4. Connecteur futur : WhatsApp Business API (canal de secours)

Non implémenté pour le MVP hackathon. À documenter selon le même gabarit (extraction / cartographie / idempotence / checkpoint / quarantaine) avant toute implémentation — ne pas coder avant que cette section soit remplie.
