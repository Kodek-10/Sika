# ADR-0001 — Capteur mécanique low-cost plutôt qu'IoT électronique

**Statut** : Actif

## Contexte

Le projet doit produire une preuve de production de biogaz exploitable par une institution financière. Deux approches techniques existent pour mesurer objectivement la production : un capteur IoT électronique connecté (débitmètre digital, transmission automatique), ou un dispositif mécanique simple (compteur à bulles) dont la lecture est capturée manuellement en photo.

## Options considérées

1. **IoT électronique complet** : précision élevée, transmission automatique, mais coût unitaire élevé, dépendance à l'alimentation électrique et à la connectivité, maintenance technique complexe pour la cible visée (producteurs ruraux/intermédiaires).
2. **Compteur mécanique à bulles + capture photo in-app** : coût très faible, aucune dépendance électrique, mais précision moindre (±15-20%) et nécessite une intervention humaine (photo) à chaque déclaration.
3. **Déclaratif pur, sans capteur** : coût nul, mais aucune preuve objective, facilement falsifiable.

## Décision

Option 2 : compteur mécanique à bulles + capture photo in-app, combiné à une déclaration structurée et un moteur de scoring de cohérence.

## Justification

La cible (éleveurs intermédiaires, petites structures) ne peut pas absorber le coût d'un IoT complet à l'échelle visée. Le compteur mécanique offre un signal de cohérence relative suffisant pour détecter les écarts flagrants (voir BR-002), sans prétendre à une précision qu'il n'a pas — ce compromis est assumé explicitement plutôt que caché.

## Conséquences

- Le moteur de scoring doit être conçu pour tolérer une marge d'erreur de mesure (±15-20%), pas pour une précision exacte — voir `../architecture/contrat-systeme.md`, seuils BR-002.
- La qualité de la preuve dépend en partie de la discipline opérationnelle (photo prise correctement, à chaque cycle) plutôt que d'une garantie purement technique — risque assumé, mitigé par l'anti-fraude (INV-002).
- Migration future vers un capteur plus précis reste possible sans remettre en cause l'architecture globale, tant que l'interface `yield-model`/scoring reste stable (voir ADR-0002).
