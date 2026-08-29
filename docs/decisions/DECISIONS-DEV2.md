# Décisions ratifiées — Dev 1 ↔ Dev 2 (paiement)

> Référencé par `apps/backend/src/scoring/scoring.constants.ts`.
> Les trois valeurs sont isolées dans ce seul fichier de constantes : ratifier
> une décision = changer une ligne, sans refactor.
>
> **Toutes les décisions ci-dessous sont ratifiées** (voir `docs/adr/0004-criteres-eligibilite-versement.md`).
> Ce fichier est conservé comme historique des décisions inter-devs.

## D1 — Seuil de score pour l'éligibilité au versement (BR-003) ✅ RATIFIÉE

**Statut** : **ratifiée** (D1 — ADR-0004).
**Valeur retenue** : `70/100` (`SEUIL_ELIGIBILITE_BR003`).

**Pourquoi 70** : le score est une moyenne pondérée de 4 signaux (0,4 / 0,2 / 0,2 / 0,2). Un producteur dont la preuve est complète et la production cohérente est à 100. 70 laisse passer un producteur ayant un signal dégradé sur deux, mais bloque celui qui cumule une preuve douteuse et une incohérence.

**Justification** : le coût d'un faux positif (verser à un fraudeur) est plus élevé que celui d'un faux négatif (refuser un producteur honnête) car l'incitation est financée par subvention MMPE et non par du crédit. Un seuil à 80 ferait d'une simple sur-déclaration grise un bloqueur, ce qui contredit le caractère « volontairement large » documenté dans BR-001/BR-002.

## D2 — Nombre minimal de déclarations avant éligibilité ✅ RATIFIÉE

**Statut** : **ratifiée** (D2 — ADR-0004).
**Valeur retenue** : `3` (`MIN_DECLARATIONS_ELIGIBILITE`).

**Pourquoi** : problème du démarrage à froid. Sans ce garde-fou, une première déclaration favorable suffirait à rendre un producteur éligible, alors que le signal temporel (stabilité des déclarations) est neutre à 100 tant qu'il y a moins de 2 points d'historique. Le score serait donc structurellement flatteur au début.

**Effet de bord assumé** : allonge le délai avant le premier versement. À arbitrer avec le rythme réel de déclaration attendu sur le terrain (Dev 3).

## D3 — Une alerte `maintenance` bloque-t-elle l'éligibilité ? ✅ RATIFIÉE

**Statut** : **ratifiée** (D3 — ADR-0004).
**Valeur retenue** : **NON** (`MAINTENANCE_ALERT_BLOQUANTE = false`).

**Pourquoi** : c'est la conséquence directe de BR-001. Une alerte `maintenance` signale une sous-performance, et sous-produire est physiquement plus facile que sur-produire — mauvais entretien, pH, rétention hydraulique. Bloquer un versement là-dessus reviendrait à sanctionner financièrement un producteur mal équipé, exactement ce que BR-001 interdit. Seule `sur_declaration` bloque.

**Contre-argument à entendre** : un partenaire IMF pourrait vouloir suspendre tout versement tant qu'une anomalie quelconque est ouverte. Si cet arbitrage change, il change la portée de BR-001 et doit donc passer par un ADR, pas par un simple basculement de constante.
