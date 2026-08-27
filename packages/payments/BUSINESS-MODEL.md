# Modèle économique — Sika

> ⚠️ **Document généré.** Ne pas éditer à la main : modifier `tools/business-model.mjs` puis lancer `npm run business-model`.
> Propriétaire : Dev 2 · Règle associée : **BR-004** — ne jamais présenter comme acquis ce qui ne l'est pas.

## 0. À lire avant de citer un seul chiffre

Le dépôt ne contient, à ce jour, **aucune donnée de coût ni de marché**. Tous les
montants de ce document sont **dérivés d'hypothèses déclarées**, pas mesurés.

Ce document n'est donc pas une prévision. C'est **un modèle de raisonnement** :
il rend explicite ce qu'il faudrait vérifier pour que le projet tienne, et il
recalcule tout dès qu'une hypothèse change.

En présentation, la formulation correcte est : « à telle hypothèse, le coût est
de tant » — jamais « le coût est de tant ».

## 1. Ce qui est réellement ancré

| Fait | Statut | Source |
|---|---|---|
| Versement borné à 500 – 500 000 FCFA, entier | `ancré` | docs/api/specification.md + contrainte base |
| Rendements de référence : 0,030 – 0,150 m³/kg selon substrat | `ancré` | infra/migrations/0003 — ⚠️ valeurs elles-mêmes PROVISOIRES (D10, Dev 3) |
| Précision du compteur mécanique : ±15–20 % | `ancré` | ADR-0001 |
| Seuil d’éligibilité BR-003 : score ≥ 70 sur 100 | `non ratifié` | D1 — docs/decisions/DECISIONS-DEV2.md, appliqué par défaut |

## 2. Hypothèses du modèle

Chacune est à valider. La colonne de droite dit **comment**.

| Paramètre | Valeur | Statut | Pourquoi cette valeur / comment la valider |
|---|---|---|---|
| Coût d’un compteur mécanique à bulles, posé | 15 000 FCFA | `hypothèse` | ADR-0001 qualifie le compteur de « coût très faible » sans le chiffrer. À remplacer par un devis fournisseur. |
| Durée de vie d’un compteur en usage terrain | 3 ans | `hypothèse` | Aucune donnée d’usure. À confirmer après une saison complète. |
| Visites de contrôle par producteur et par an | 4 visites/an | `hypothèse` | Une visite par trimestre. Le rythme réel dépendra du taux d’alerte observé (BR-002). |
| Coût complet d’une visite (transport + temps agent) | 5 000 FCFA | `hypothèse` | À caler sur la zone de déploiement réelle : la dispersion des sites domine ce coût. |
| Versements Mobile Money par producteur et par an | 12 versements/an | `hypothèse` | Hypothèse d’un versement mensuel. La périodicité n’est pas arbitrée. |
| Montant moyen d’un versement | 15 000 FCFA | `hypothèse` | docs/api/specification.md utilise 15 000 comme EXEMPLE de payload, pas comme politique de versement. Borne technique ancrée : 500 – 500 000. |
| Commission opérateur Mobile Money | 1,5 % | `hypothèse` | Varie fortement par opérateur et par palier. À obtenir PAR ÉCRIT avant tout engagement — voir PARTNERSHIPS.md. |
| Commission minimale par transaction | 100 FCFA | `hypothèse` | Les grilles Mobile Money sont souvent par paliers, pas linéaires. À confirmer. |
| Crédit moyen débloqué pour un producteur éligible | 300 000 FCFA | `hypothèse` | Ordre de grandeur d’un micro-crédit équipement. Aucune IMF n’a confirmé de fourchette. |
| Commission Sika sur un crédit facilité | 3,0 % | `hypothèse` | Aucune négociation engagée. Ce taux est une cible, pas un accord. |

## 3. Ce que le modèle ne compte pas comme un coût

**Le versement lui-même n'est pas une charge Sika.** En phase 1, Sika décaisse
une incitation financée par un bailleur : l'argent transite, il ne sort pas de
nos fonds propres. Seule la **commission de l'opérateur** est à notre charge.

Cette dernière affirmation repose sur une hypothèse non vérifiée : *que
l'opérateur facture l'émetteur et non le bénéficiaire*. Si c'est l'inverse, le
producteur reçoit moins que le montant annoncé — ce qui est un **problème de
confiance**, pas seulement de comptabilité. C'est la première question à poser
à tout opérateur Mobile Money (voir `PARTNERSHIPS.md`).

## 4. Coût variable d'un producteur suivi

| Poste | FCFA / producteur / an | Détail du calcul |
|---|---:|---|
| Amortissement du compteur | 5 000 | 15 000 ÷ 3 ans |
| Visites de contrôle | 20 000 | 4 × 5 000 |
| Commissions Mobile Money | 2 700 | 12 × 225 |
| **Total variable** | **27 700** | |

## 5. Recette annuelle nécessaire par producteur

Combien chaque producteur doit rapporter par an pour couvrir coût variable **et**
charges fixes. Les enveloppes de charges fixes sont des **scénarios déclarés**,
pas des budgets validés.

- **Pilote bénévole** — 1 500 000 FCFA/an : hébergement + frais, équipe non rémunérée
- **Pilote encadré** — 12 000 000 FCFA/an : 1 coordinateur terrain + hébergement
- **Déploiement** — 36 000 000 FCFA/an : 3 ETP + hébergement + support

| Charges fixes annuelles | 50 prod. | 200 prod. | 500 prod. | 1 000 prod. | 2 000 prod. |
|---|---:|---:|---:|---:|---:|
| **Pilote bénévole** — 1 500 000 | 57 700 | 35 200 | 30 700 | 29 200 | 28 450 |
| **Pilote encadré** — 12 000 000 | 267 700 | 87 700 | 51 700 | 39 700 | 33 700 |
| **Déploiement** — 36 000 000 | 747 700 | 207 700 | 99 700 | 63 700 | 45 700 |

**Lecture.** La décroissance est brutale au début puis s'aplatit : au-delà de
quelques centaines de producteurs, la recette nécessaire tend vers le coût
variable (27 700 FCFA). Ce plancher ne descend pas avec le volume —
**seul un coût variable plus bas le fait descendre.** C'est là que se joue la
viabilité, pas dans la croissance du nombre de producteurs.

## 6. Voie 1 — Subvention / contrat pilote MMPE

C'est la voie prioritaire (README §6). Le modèle l'exprime comme une **demande
chiffrable** plutôt que comme un espoir :

> Pour suivre **N** producteurs sous l'enveloppe **E**, Sika a besoin de
> **recette_nécessaire(N, E)** FCFA par producteur et par an.

Le tableau §5 est donc directement l'argumentaire de financement : il dit ce
qu'on demande, pour combien de producteurs, et de quoi c'est fait.

## 7. Voie 2 — Commission sur crédit facilité (IMF)

Recette = part éligible × crédit moyen × taux de commission.

La **part éligible** est l'inconnue majeure : elle dépend de la distribution
réelle des scores, qu'aucune donnée ne permet aujourd'hui d'estimer. Elle dépend
aussi directement du **seuil D1 (score ≥ 70)**, qui n'est pas ratifié.

| Part de producteurs éligibles | Recette / producteur / an | Point mort — Pilote bénévole | Point mort — Pilote encadré | Point mort — Déploiement |
|---|---:|---:|---:|---:|
| 20,0 % | 1 800 | jamais | jamais | jamais |
| 40,0 % | 3 600 | jamais | jamais | jamais |
| 60,0 % | 5 400 | jamais | jamais | jamais |
| 80,0 % | 7 200 | jamais | jamais | jamais |

**Le lien à ne pas manquer.** Monter le seuil D1 réduit la part éligible, donc la
recette, mais réduit aussi le risque de défaut — donc la valeur perçue par l'IMF.
Le seuil n'est pas qu'un réglage technique : **c'est un paramètre économique.**
Il ne devrait pas être arbitré par Dev 1 seul.

*« jamais »* signifie que la recette ne couvre pas le coût variable
(27 700 FCFA) : aucun volume ne rend ce scénario viable — chaque
producteur ajouté aggrave la perte.

### Le résultat qu'il faut assumer

Sous les hypothèses déclarées, **cette voie ne finance jamais le suivi à elle
seule** : même à 100 % d'éligibilité, elle rapporte
9 000 FCFA par producteur, contre
27 700 FCFA de coût variable. Ce n'est pas un problème d'échelle : le
volume n'y change rien.

Voici ce qu'il faudrait pour qu'elle tienne debout — en ne couvrant *que* le
coût variable, charges fixes exclues :

| Part éligible | Taux de commission requis (à crédit de 300 000) | Crédit moyen requis (à taux de 3,0 %) |
|---|---:|---:|
| 20,0 % | 46,2 % | 4 616 667 |
| 40,0 % | 23,1 % | 2 308 333 |
| 60,0 % | 15,4 % | 1 538 889 |
| 80,0 % | 11,5 % | 1 154 167 |

**Lecture.** Les taux requis sont hors de tout usage de marché. La colonne de
droite est la lecture utile : cette voie ne devient cohérente que sur des
crédits **d'un tout autre ordre de grandeur** que l'hypothèse retenue —
c'est-à-dire un équipement lourd, pas un micro-crédit.

**Conséquence pour le pitch.** Présenter la commission IMF comme une source de
revenu autonome ne résiste pas au calcul. Sa vraie valeur est ailleurs : elle
**complète** la subvention et surtout elle **prouve l'utilité du score** à un
tiers payeur. C'est un argument de traction, pas une ligne de recette. Le
README §6 doit être lu dans ce sens.

## 8. Voie 3 — Vérification carbone

**Non activée, et volontairement absente des chiffres.** Les standards carbone
exigent une vérification physique tierce que Sika ne remplace pas (cf.
`PITCH-OBJECTIONS.md`). L'inscrire dans un plan de recettes serait exactement
ce que BR-004 interdit.

## 9. Sensibilité — où porter l'effort

Chaque hypothèse varie de ±30 %, les autres restant fixes.

| Hypothèse variée de ±30 % | Coût à −30 % | Coût à +30 % | Amplitude | En part du coût de base |
|---|---:|---:|---:|---:|
| Visites de contrôle par producteur et par an | 21 700 | 33 700 | **12 000** | 43,3 % |
| Coût complet d’une visite (transport + temps agent) | 21 700 | 33 700 | **12 000** | 43,3 % |
| Durée de vie d’un compteur en usage terrain | 29 843 | 26 546 | **3 297** | 11,9 % |
| Coût d’un compteur mécanique à bulles, posé | 26 200 | 29 200 | **3 000** | 10,8 % |
| Versements Mobile Money par producteur et par an | 26 890 | 28 510 | **1 620** | 5,8 % |
| Commission opérateur Mobile Money | 26 890 | 28 510 | **1 620** | 5,8 % |

**Conclusion.** Deux hypothèses sont à égalité en tête — **visites de contrôle par producteur et par an** et **coût complet d’une visite (transport + temps agent)** — ce qui est attendu : elles se multiplient l'une l'autre. Il faut donc lire non pas « un paramètre » mais **un poste** : le coût des visites terrain, à lui seul 12 000 FCFA d'amplitude, soit
43,3 % du coût de base.

C'est la première hypothèse à faire tomber par une mesure réelle, avant toute
autre discussion budgétaire. Concrètement : **une tournée terrain chronométrée
sur une dizaine de sites réels** vaut plus que n'importe quel raffinement de ce
modèle. Tout le reste — compteur, commissions — pèse trois à sept fois moins.

## 10. Les trois inconnues qui portent tout le modèle

1. **Le coût réel d'une visite terrain.** Il dépend de la dispersion des sites,
   qu'aucun déploiement n'a encore mesurée.
2. **La part de producteurs franchissant le seuil D1.** Inconnue tant qu'il
   n'existe pas de déclarations réelles en volume.
3. **Qui paie la commission Mobile Money.** Question fermée, à poser par écrit
   à l'opérateur — elle change à la fois le coût et la promesse faite au producteur.

Tant que ces trois-là ne sont pas répondues, ce document sert à **cadrer la
discussion**, pas à la conclure.
