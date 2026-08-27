# Pitch et objections anticipées

> Propriétaire : Dev 2 — à tenir cohérent avec [`PARTNERSHIPS.md`](./PARTNERSHIPS.md),
> [`BUSINESS-MODEL.md`](./BUSINESS-MODEL.md) et [`packages/scoring-engine/README.md`](../scoring-engine/README.md) (**BR-004**).

## Principe

Sur ce projet, la crédibilité vient de ce qu'on **refuse** d'affirmer. Chaque
réponse ci-dessous nomme sa limite. Une objection à laquelle on répond « oui,
c'est une faiblesse connue, voici comment on la traite » se retourne en argument.
Une affirmation prise en défaut détruit tout le reste.

## Fiabilité du scoring

**« Comment empêchez-vous un producteur de déclarer des volumes fictifs cohérents pour obtenir un crédit ? »**
Le scoring croise trois sources indépendantes (déclaration, lecture compteur,
historique). Le crédit est débloqué en tranches liées à des points de contrôle.
*Limite assumée :* un fraudeur patient et cohérent sur la durée reste possible —
c'est pourquoi le score priorise les visites terrain au lieu de prétendre les
remplacer.

**« Pourquoi une IMF vous ferait confiance plus qu'à un dossier papier classique ? »**
Traçabilité temporelle et détection d'anomalies automatisée, impossibles avec un
dossier papier. Le score n'est pas un verdict : c'est un **ordre de priorité**
pour l'attention humaine.

**« Qu'est-ce qui différencie Sika d'un simple tableur Excel ? »**
Score dynamique, croisement automatique de sources, détection d'anomalies,
intégration paiement, et surtout **des invariants tenus par la base** — un tableur
ne garantit pas qu'un versement ne partira pas deux fois.

**« Votre scoring sera-t-il accepté par les standards carbone officiels ? »**
Non, pas seul — et c'est assumé. Ces standards exigent une vérification physique
tierce. Sika en réduit le coût en priorisant les sites à auditer.

**« Vos rendements de référence sont-ils calibrés ? »**
**Non.** Les valeurs en base sont des ordres de grandeur issus de la littérature,
marqués `PROVISOIRE` dans la migration elle-même. Le référentiel calibré est
attendu de Dev 3. Le schéma n'a pas à changer pour l'accueillir.

## Modèle économique

**« Vous vivez de quoi la première année ? »**
Subvention / contrat pilote MMPE en priorité — voir
[`BUSINESS-MODEL.md`](./BUSINESS-MODEL.md) §6, qui exprime la demande de
financement comme un montant par producteur suivi, décomposé poste par poste.

**« Combien vous coûte le suivi d'un producteur ? »**
Environ **27 700 FCFA par an sous nos hypothèses** — dont 20 000 de visites
terrain. *À dire dans la même phrase :* ce chiffre est **dérivé d'hypothèses
déclarées, pas mesuré**. Aucun coût réel n'a encore été relevé sur le terrain.

**« La commission sur les crédits, ça rapporte combien ? »**
Pas assez pour financer le suivi : environ 9 000 FCFA par producteur et par an
même à 100 % d'éligibilité. **Nous le savons parce que nous avons fait le
calcul** — il est dans le dépôt, reproductible. Cette voie n'est pas une ligne de
recette autonome : c'est une preuve que le score déplace une décision de crédit.
La recette de la phase 1 est la subvention.

**« Et si vos hypothèses de coût sont fausses ? »**
Le poste qui domine est identifié : les visites terrain, 43 % du coût variable.
Une tournée chronométrée sur une dizaine de sites réels fait tomber
l'incertitude principale. Tout le modèle est un script : on change l'hypothèse,
on régénère.

## Partenariats et exécution

**« Avec quelles institutions travaillez-vous ? »**
**Aucune, à ce jour.** Quatre IMF sont identifiées comme cibles ; aucune n'est
contactée, aucun accord n'existe. Ce que nous apportons à une première
conversation n'est pas une demande de commission, mais des questions précises —
fourchette de crédit réelle, critères d'octroi actuels, taux de refus.

**« Votre intégration Mobile Money fonctionne ? »**
Le circuit fonctionne **de bout en bout en simulation** : idempotence, gestion des
échecs, quarantaine. Aucun argent ne circule et **aucun opérateur n'est encore
identifié**. Le branchement réel tient en une interface à implémenter et une ligne
à changer dans le module.

**« Qu'est-ce qui vous bloque là, maintenant ? »**
Trois inconnues, nommées : le coût réel d'une visite, la part de producteurs
franchissant le seuil, et qui supporte la commission Mobile Money. Les trois se
lèvent par des mesures terrain, pas par du développement.

## À tenir à jour

Avant chaque présentation, dérouler la checklist du §5 de
[`PARTNERSHIPS.md`](./PARTNERSHIPS.md).
