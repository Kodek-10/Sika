# Politique de sécurité — Sika

## 1. Signaler une vulnérabilité

Ne pas ouvrir d'issue publique sur le dépôt pour une vulnérabilité de sécurité — une issue publique expose le problème avant qu'il soit corrigé.

À la place : contacter directement un membre de l'équipe (Dev 1, Dev 2 ou Dev 3) par un canal privé (message direct, pas de canal partagé public). Préciser :
- Le module concerné (voir [`docs/architecture/README.md`](./docs/architecture/README.md) pour la propriété).
- Les étapes pour reproduire, si possible.
- L'impact estimé (accès à des données d'un autre producteur, contournement d'un rôle, falsification de preuve, etc.).

Ce projet est un prototype de hackathon en développement actif — il n'y a pas encore de programme de bug bounty ni de délai de réponse contractuel, mais toute remontée sera traitée en priorité par la personne responsable du module concerné.

## 2. Périmètre couvert

Ce document couvre `apps/backend/`, `apps/field-app/`, `apps/dashboard/`, et les packages `packages/scoring-engine/` et `packages/payments/`. Les dépendances tierces (opérateur Mobile Money, hébergement) suivent leurs propres politiques de sécurité respectives.

## 3. Données sensibles manipulées par Sika

| Donnée | Sensibilité | Traitement attendu |
|---|---|---|
| Numéro de téléphone du producteur | Identifiant personnel | Jamais exposé à un rôle autre que `agent`, `imf` (portefeuille), `mmpe`, ou le producteur lui-même — voir FR-006 |
| Géolocalisation de capture (`meter_readings.geo_lat/geo_lng`) | Localisation d'une activité économique réelle | Utilisée uniquement pour la vérification anti-fraude (INV-002), jamais exposée publiquement ni utilisée à d'autres fins |
| Photo du compteur | Peut révéler l'emplacement et l'installation du producteur | Stockage restreint, accès limité aux rôles autorisés sur la déclaration correspondante |
| Référence de transaction Mobile Money | Donnée financière | Jamais loguée en clair dans les logs applicatifs |
| Score de confiance et alertes | Donnée pouvant affecter l'accès au crédit d'un producteur | Accès strictement filtré par rôle (FR-006), jamais accessible à un autre producteur que soi-même |

## 4. Principes de sécurité applicative attendus

Ces principes s'appliquent à tout le code, en particulier `apps/backend/src/auth/` et `apps/backend/src/anti-fraud/` :

- **Vérification des rôles côté serveur uniquement.** Une vérification de rôle côté client (app terrain, dashboard) n'est jamais suffisante — voir FRB-008 dans [`docs/exigences-produit/logiciel.md`](./docs/exigences-produit/logiciel.md).
- **Validation stricte des entrées** sur tous les endpoints, en particulier `POST /declarations` — voir INV-004, ERR-422-UNKNOWN-SUBSTRATE.
- **Pas d'injection SQL** — utiliser l'ORM/requêtes paramétrées, jamais de concaténation de chaînes SQL.
- **Horodatage et géolocalisation non falsifiables côté client** — générés uniquement par la capture in-app, jamais acceptés comme champ modifiable dans une requête (INV-002).
- **Aucune donnée sensible en clair dans les logs** (numéro de téléphone, référence de paiement, token d'authentification).
- **Idempotence sur les opérations financières** (`POST /payments/payout`) pour éviter un double versement en cas de requête dupliquée — voir [`docs/guide-connecteur/README.md`](./docs/guide-connecteur/README.md) section 3.

## 5. Limitations connues (statut MVP hackathon)

Ce projet est au stade prototype (voir [`docs/README.md`](./docs/README.md) section "Statut actuel"). À la date de rédaction :
- Aucun audit de sécurité externe n'a été réalisé.
- L'intégration Mobile Money est simulée pour la démo (voir [`docs/demo/scenario-mvp.md`](./docs/demo/scenario-mvp.md)) — le chemin réel avec un opérateur en production n'a pas été testé en conditions réelles.
- La conformité réglementaire BCEAO/UEMOA sur l'intégration Mobile Money n'a été vérifiée qu'en grandes lignes (voir [`packages/payments/README.md`](./packages/payments/README.md)), pas validée juridiquement.

Ces limitations doivent être communiquées honnêtement à tout partenaire ou jury qui pose la question — cohérent avec BR-004 (ne jamais présenter comme acquis ce qui ne l'est pas).

## 6. Versions supportées

Projet à branche unique active (`main`) au stade hackathon — pas de politique de versions multiples pour l'instant. Cette section sera mise à jour si le projet passe en phase de présélection avec un cycle de release formalisé.
